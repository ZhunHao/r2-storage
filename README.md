# R2 Storage

A Icloud Drive-like file manager for Cloudflare R2. Browse, upload, download, and share files across multiple R2 buckets through a modern web UI.

## Features

- **Multi-bucket support** — switch between R2 buckets in the sidebar. Buckets are auto-discovered from wrangler bindings.
- **Grid + list views** — toggle between card grid and table list
- **Drag-and-drop upload** — drop files anywhere to upload. Large files (>95MB) use multipart upload automatically.
- **File preview** — images, video, audio, PDF, text, and code files
- **Share links** — create password-protected, expiring, download-limited share URLs
- **Context menu** — right-click for download, rename, share, delete
- **Multi-select** — click, shift-click, ctrl-click for batch operations
- **Breadcrumb navigation** — click any path segment to navigate

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Cloudflare Workers |
| Adapter | @opennextjs/cloudflare |
| UI | shadcn/ui + TailwindCSS v4 |
| Data | TanStack Query v5 |
| State | Zustand v5 |
| Auth | Cloudflare Access (Zero Trust) |

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate Cloudflare types from wrangler.jsonc
pnpm cf-typegen

# Start local preview (runs in Workers runtime with R2 bindings)
pnpm preview
```

Open [http://localhost:8787](http://localhost:8787).

### Dev vs Preview

| Command | Runtime | R2 Bindings | Use For |
|---------|---------|-------------|---------|
| `pnpm dev` | Node.js | No | Fast UI iteration (hot reload) |
| `pnpm preview` | workerd (Workers) | Yes | Full testing with R2 access |

Use `pnpm dev` for rapid UI changes. Use `pnpm preview` to test file operations against real R2 buckets.

## Configuration

### R2 Buckets

Add buckets in `wrangler.jsonc`. No code changes needed — buckets are discovered at runtime.

```jsonc
{
  "r2_buckets": [
    { "binding": "WEBSITE_ASSETS", "bucket_name": "my-website-assets" },
    { "binding": "EXPLORER_TEST", "bucket_name": "explorer-test" }
  ]
}
```

### Authentication

Authentication is handled by [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) (Zero Trust). Configure an Access application for your domain in the Cloudflare Zero Trust dashboard.

Set the team name as a Worker secret:

```bash
echo "your-team-name" | npx wrangler secret put CF_ACCESS_TEAM_NAME
```

### Local Development

Create `.dev.vars` for local environment variables:

```
NEXTJS_ENV=development
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server (Node.js, no R2) |
| `pnpm preview` | Build + run in Workers runtime (with R2) |
| `pnpm build` | Build Next.js for production |
| `pnpm deploy` | Build + deploy to Cloudflare Workers |
| `pnpm cf-typegen` | Regenerate Cloudflare env types |

## API Routes

All routes are under `/api/`. Share links have a public endpoint at `/share/[shareId]`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/server/config` | Bucket list and server info |
| GET | `/api/buckets/[bucket]` | List objects (prefix, cursor, delimiter) |
| POST | `/api/buckets/[bucket]` | Upload file (FormData) |
| POST | `/api/buckets/[bucket]/folder` | Create folder |
| POST | `/api/buckets/[bucket]/delete` | Delete file or folder |
| POST | `/api/buckets/[bucket]/move` | Move/rename (copy + delete) |
| POST | `/api/buckets/[bucket]/copy` | Copy object |
| GET | `/api/buckets/[bucket]/object/[...key]` | Download file |
| HEAD | `/api/buckets/[bucket]/object/[...key]` | File metadata |
| POST | `/api/buckets/[bucket]/object/[...key]` | Update metadata |
| POST | `/api/buckets/[bucket]/multipart/create` | Start multipart upload |
| POST | `/api/buckets/[bucket]/multipart/upload` | Upload chunk |
| POST | `/api/buckets/[bucket]/multipart/complete` | Complete multipart |
| GET | `/api/buckets/[bucket]/shares` | List share links |
| POST | `/api/buckets/[bucket]/shares` | Create share link |
| DELETE | `/api/buckets/[bucket]/share/[shareId]` | Delete share link |
| GET | `/share/[shareId]` | Public download (no auth) |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/[bucket]/[[...path]]/  # File browser page
│   ├── share/[shareId]/                   # Public share route
│   └── api/                               # API route handlers
├── components/
│   ├── layout/          # Sidebar, header
│   ├── files/           # Browser, grid/list views, context menu
│   ├── upload/          # Drop zone, progress
│   ├── dialogs/         # Share dialog
│   └── ui/              # shadcn/ui primitives
├── hooks/               # TanStack Query hooks
├── stores/              # Zustand stores (app, upload, selection)
├── lib/                 # API client, R2 helpers, file utilities
└── types/               # TypeScript interfaces
```

## Documentation

- [API Reference](docs/API.md) -- all REST endpoints with request/response examples
- [Architecture](docs/ARCHITECTURE.md) -- system design, data flow, and component tree
- [Deployment Guide](docs/DEPLOYMENT.md) -- build, deploy, and configure for production

## Deployment

Deployed automatically via Cloudflare Workers Builds on push to `main`. The build command in `wrangler.jsonc` runs `npx opennextjs-cloudflare build`.

Manual deploy:

```bash
pnpm deploy
```
