# Architecture

## Overview

R2 Storage is a single-page application with a Next.js backend deployed on Cloudflare Workers. The frontend renders entirely on the client (React client components) while the backend provides REST API routes that access R2 buckets via Cloudflare Worker bindings.

```
Browser (React SPA)
    |
    | HTTPS
    v
Cloudflare Access (Zero Trust auth)
    |
    v
Cloudflare Worker (Next.js via @opennextjs/cloudflare)
    |
    | R2 Bindings
    v
Cloudflare R2 (Object Storage)
```

## Key Design Decisions

### No App-Level Auth
Authentication is fully delegated to Cloudflare Access. The Worker never checks credentials -- if a request reaches the API, it has already passed Zero Trust policies. This eliminates auth code, session management, and token handling from the app.

### Client-Side Rendering Only
All UI components are React client components (`"use client"`). There is no SSR for the dashboard. The home page redirects to the first bucket on load. This simplifies the architecture since R2 data is inherently dynamic.

### R2 Bucket Auto-Discovery
Buckets are not hardcoded. `discoverBuckets()` in `src/lib/r2.ts` inspects the Worker environment at runtime, filtering for R2Bucket objects. Adding a new bucket to `wrangler.jsonc` makes it appear in the UI automatically.

### Folders Are Conventions
R2 is flat key-value storage. Folders are represented as zero-byte objects with trailing `/`. The API uses `delimiter="/"` to list objects hierarchically via `delimitedPrefixes`.

### Move = Copy + Delete
R2 has no native rename/move operation. The move endpoint copies the object (preserving metadata) then deletes the source. For folders, this is recursive.

### Share Metadata in R2
Share link metadata is stored as JSON files inside each bucket at `.r2-storage/shares/{shareId}.json`. No external database needed. The public download endpoint searches all buckets for the share ID.

## Data Flow

### State Management

```
Server State (TanStack Query)         Client State (Zustand)
  |                                      |
  |-- useServerConfig() -> buckets       |-- useAppStore
  |   (fetched once on load)             |   viewMode, selectedBucket, readonly
  |                                      |
  |-- useFileList(bucket, prefix)        |-- useSelectionStore
  |   (infinite query with cursor)       |   selectedKeys, range/multi select
  |                                      |
  '-- API client (fetch wrapper)         '-- useUploadStore
                                             file queue, progress, status
```

**TanStack Query** manages server state (file lists, config). Queries auto-invalidate after mutations (delete, move, upload).

**Zustand** manages UI state (view mode, selection, uploads). View mode persists to localStorage.

### Upload Flow

```
User drops files / clicks upload
    |
    v
Files added to upload store (status: pending)
    |
    v
[size < 95MB?] ---yes---> POST /api/buckets/[bucket] (FormData)
    |                         |
    no                        v
    |                    Upload complete
    v
POST multipart/create (get uploadId)
    |
    v
POST multipart/upload (per part, ~10MB each)
    |  (progress tracked via XHR onprogress)
    v
POST multipart/complete (finalize)
    |
    v
Upload store updated (status: completed)
    |
    v
File list query invalidated (auto-refresh)
```

### Share Link Flow

```
User clicks Share on a file
    |
    v
ShareDialog opens (configure expiry + download limit)
    |
    v
POST /api/buckets/[bucket]/shares
    |
    v
Share metadata saved to .r2-storage/shares/{id}.json in R2
    |
    v
URL returned: /share/{shareId}
    |
    v
Public user visits /share/{shareId} (no auth)
    |
    v
GET /share/[shareId] handler:
  1. Search all buckets for share metadata
  2. Validate expiry and download count
  3. Increment download counter
  4. Stream file with Content-Disposition: attachment
```

## Component Tree

```
RootLayout
  ThemeProvider
  QueryProvider
  Toaster (sonner)
  HeaderBar ("R2 Storage" branding)
  DashboardLayout
    SidebarProvider
      AppSidebar (bucket list)
      SidebarInset
        AppHeader (toolbar: upload, download, delete, rename, share, move, view toggle)
        main
          BucketPage
            FileBrowser
              DropZone (drag-drop wrapper)
              BreadcrumbNav (path + item count)
              FileGridView | FileListView (based on viewMode)
              FileContextMenu (right-click)
              ShareDialog
              MoveDialog
              UploadProgress (floating panel)
```

### Communication Patterns

- **Props**: Standard parent-to-child data flow
- **Zustand stores**: Cross-component state (selection, uploads, app config)
- **Window events**: Header dispatches custom events (`r2-move`, `r2-share`) caught by FileBrowser for loose coupling between layout and page components
- **Query invalidation**: After mutations, `queryClient.invalidateQueries` triggers automatic refetch

## File Layout

```
src/
  app/
    layout.tsx                              # Root: providers, theme, toaster
    page.tsx                                # Home: redirect to first bucket
    (dashboard)/
      layout.tsx                            # Dashboard shell: sidebar + header
      [bucket]/[[...path]]/page.tsx          # File browser for bucket/path
    api/
      server/config/route.ts                # GET: bucket list, server mode
      buckets/[bucket]/
        route.ts                            # GET: list objects, POST: upload
        object/[...key]/route.ts            # GET: download, HEAD: metadata, POST: update metadata
        folder/route.ts                     # POST: create folder
        copy/route.ts                       # POST: copy object
        move/route.ts                       # POST: move (copy+delete)
        delete/route.ts                     # POST: delete (recursive for folders)
        multipart/
          create/route.ts                   # POST: initiate multipart
          upload/route.ts                   # POST: upload part
          complete/route.ts                 # POST: finalize multipart
        shares/route.ts                     # GET: list shares, POST: create share
        share/[shareId]/route.ts            # DELETE: remove share
    share/[shareId]/route.ts                # GET: public download (no auth)

  components/
    layout/
      app-sidebar.tsx                       # Bucket navigation
      app-header.tsx                        # Toolbar with all file actions
      header-bar.tsx                        # Top branding bar
    files/
      file-browser.tsx                      # Master container, wires everything
      file-grid-view.tsx                    # Icon grid (macOS Finder style)
      file-list-view.tsx                    # Table view with columns
      breadcrumb-nav.tsx                    # Path breadcrumbs + stats
      file-context-menu.tsx                 # Right-click menu
      selection-action-bar.tsx              # Batch action bar
      empty-state.tsx                       # Empty folder placeholder
      view-toggle.tsx                       # Grid/list switcher
    upload/
      drop-zone.tsx                         # Drag-drop area
      upload-progress.tsx                   # Upload queue panel
    dialogs/
      share-dialog.tsx                      # Share link creation
      move-dialog.tsx                       # Move files to folder
    ui/                                     # shadcn/ui primitives

  hooks/
    use-file-list.ts                        # Infinite query for file listing
    use-server-config.ts                    # Server config fetch + store sync
    use-mobile.ts                           # Responsive breakpoint hook

  stores/
    app-store.ts                            # Buckets, viewMode, sidebar, readonly
    selection-store.ts                      # Selected keys, range/multi select
    upload-store.ts                         # Upload queue, progress, status

  lib/
    api-client.ts                           # Typed fetch wrapper for all endpoints
    r2.ts                                   # Server-side R2 bucket discovery
    file-utils.ts                           # Formatting, MIME types, path helpers
    encoding.ts                             # Base64 encode/decode for keys
    utils.ts                                # cn() class merge utility

  types/
    index.ts                                # All TypeScript interfaces
```

## AI File Intelligence (Phase 1)

Full design detail in [`docs/PHASE-1-ARCHITECTURE.md`](PHASE-1-ARCHITECTURE.md) and [`docs/PHASE-1-SYSTEM-DESIGN.md`](PHASE-1-SYSTEM-DESIGN.md). Summary below.

### Module Boundary

```
src/lib/
  ai.ts          — Workers AI client through AI Gateway. Exports embed() and chatStream().
  vectorize.ts   — Typed wrapper over VECTOR_INDEX binding. Exports upsert / deleteByIds / query.
  indexing.ts    — Composes ai + vectorize into indexOnWrite(env, bucket, key, obj)
                   and indexOnDelete(env, bucket, keys). Filters folders and .r2-storage/.
  path-utils.ts  — basename / dirname without Node path polyfill.
  chat-prompt.ts — Pure: isChatSupported, chunkText, cosineSim, buildPrompt.
  sse.ts         — SSE frame helper for TransformStream writers.
```

### Indexing Hook Contract

Every R2 mutation handler (upload, move/copy, delete, multipart-complete) calls:

```ts
ctx.waitUntil(indexOnWrite(env, bucket, key, obj))   // upload / copy / move dst
ctx.waitUntil(indexOnDelete(env, bucket, [key]))      // delete / move src
```

`ctx` is obtained from `getCloudflareContext()`. The call is fire-and-forget — the HTTP response returns immediately and indexing races in the background. Forgetting this = silent search staleness.

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/search` | Semantic search across a bucket |
| POST | `/api/chat/[bucket]/[...key]` | Chat with file contents (SSE) |
| POST | `/api/admin/[bucket]/reindex` | Bulk re-index a bucket (Access-gated) |

### AI Data Flow

```
User query
    |
    v
GET /api/search?bucket=&q=
    |
    v
embed(query)  →  AI Gateway  →  Workers AI bge-small-en-v1.5
    |
    v
Vectorize.query(vector, { filter: { bucket } })
    |
    v
Hybrid rank (vector score + substring boost)
    |
    v
JSON results { key, score, name, size, ... }
```

```
User message on file
    |
    v
POST /api/chat/[bucket]/[...key]  (SSE)
    |
    v
R2.get(key) → chunk + retrieve top-k context
    |
    v
chatStream(messages)  →  AI Gateway  →  Workers AI llama-3.1-8b-instruct-fp8
    |
    v
SSE token stream → ChatPanel UI
```

### Cloudflare Resources

- **Vectorize index:** `r2-files` (384-dim cosine). Metadata index on `bucket` (string) required for filtered queries.
- **AI Gateway:** `r2-storage` (cache on, logs on, auth via binding). All `embed` and `chatStream` calls go through this — never `env.AI.run` directly.
- **Models:** `@cf/baai/bge-small-en-v1.5` (embeddings), `@cf/meta/llama-3.1-8b-instruct-fp8` (chat, max_tokens: 1024).

---

## Type System

Key types defined in `src/types/index.ts`:

| Type | Purpose |
|------|---------|
| `FileItem` | Unified file/folder model for UI |
| `R2ObjectInfo` | Raw R2 object metadata |
| `ListObjectsResponse` | Paginated listing response |
| `ShareMetadata` | Share link configuration |
| `UploadFile` | Upload queue item with progress |
| `ServerConfig` | Available buckets and mode |
| `ViewMode` | `"grid" \| "list"` |
| `BucketInfo` | Bucket name wrapper |
