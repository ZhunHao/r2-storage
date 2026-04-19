# API Reference

All endpoints are under `/api/` and require authentication via Cloudflare Access. Responses use JSON unless streaming a file.

## Server Configuration

### GET /api/server/config

Returns available buckets and server mode.

**Response:**
```json
{
  "buckets": [{ "name": "WEBSITE_ASSETS" }, { "name": "EXPLORER_TEST" }],
  "readonly": false
}
```

---

## Bucket Operations

All bucket endpoints use the pattern `/api/buckets/[bucket]/...` where `[bucket]` is the R2 binding name.

### GET /api/buckets/[bucket]

List objects in a bucket with prefix-based hierarchy.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `prefix` | string | `""` | Filter objects by key prefix |
| `delimiter` | string | `"/"` | Hierarchy delimiter |
| `cursor` | string | -- | Pagination cursor |
| `limit` | number | `1000` | Max objects per page |

**Response:**
```json
{
  "objects": [
    {
      "key": "photos/image.png",
      "size": 204800,
      "uploaded": "2026-04-10T12:00:00Z",
      "httpMetadata": { "contentType": "image/png" },
      "customMetadata": {}
    }
  ],
  "delimitedPrefixes": ["photos/vacation/"],
  "truncated": false,
  "cursor": "next-page-token"
}
```

Responses are edge-cached in KV for 60 s per (bucket, prefix, cursor, delimiter, limit) cache key. Mutations to the bucket asynchronously invalidate every cached entry under that bucket via `ctx.waitUntil`. A stale-while-revalidate window of up to ~60 s can appear after a mutation on account of KV list eventual consistency.

### POST /api/buckets/[bucket]

Upload a single file.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload |
| `key` | string | Destination key (path) |

**Response:**
```json
{ "success": true, "key": "photos/image.png" }
```

---

## Object Operations

### GET /api/buckets/[bucket]/object/[...key]

Download an object. Returns the file as a stream with appropriate headers.

**Response Headers:**
- `Content-Type` -- MIME type
- `Content-Length` -- File size
- `ETag` -- Entity tag

**Errors:**
- `404` -- Object not found

### HEAD /api/buckets/[bucket]/object/[...key]

Get object metadata without downloading the body.

**Response Headers:** Same as GET.

### POST /api/buckets/[bucket]/object/[...key]

Update object metadata (re-puts object with merged metadata).

**Request:**
```json
{
  "httpMetadata": { "contentType": "image/jpeg" },
  "customMetadata": { "description": "Beach photo" }
}
```

**Response:**
```json
{ "success": true }
```

---

## Folder Operations

### POST /api/buckets/[bucket]/folder

Create a folder (zero-byte object with trailing `/`).

**Request:**
```json
{ "path": "photos/vacation/" }
```

**Response:**
```json
{ "success": true, "path": "photos/vacation/" }
```

---

## Copy / Move / Delete

### POST /api/buckets/[bucket]/copy

Copy an object within the same bucket.

**Request:**
```json
{
  "sourceKey": "photos/image.png",
  "destinationKey": "backup/image.png"
}
```

### POST /api/buckets/[bucket]/move

Move (rename) an object. Implemented as copy + delete.

**Request:**
```json
{
  "sourceKey": "photos/image.png",
  "destinationKey": "photos/renamed.png"
}
```

### POST /api/buckets/[bucket]/delete

Delete an object or folder. Folder deletes are recursive (all contents removed in batches of 1000).

**Request:**
```json
{ "key": "photos/image.png" }
```

All three respond with:
```json
{ "success": true }
```

---

## Multipart Upload

For files >= 95 MB. Three-step process:

### 1. POST /api/buckets/[bucket]/multipart/create

Initiate upload session.

**Request:**
```json
{
  "key": "videos/large-file.mp4",
  "httpMetadata": { "contentType": "video/mp4" }
}
```

**Response:**
```json
{ "uploadId": "abc123", "key": "videos/large-file.mp4" }
```

### 2. POST /api/buckets/[bucket]/multipart/upload

Upload a single part.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `key` | string | Object key |
| `uploadId` | string | From create step |
| `partNumber` | number | 1-based part index |

**Request Body:** Raw binary data (ArrayBuffer)

**Response:**
```json
{ "etag": "\"abc123\"", "partNumber": 1 }
```

### 3. POST /api/buckets/[bucket]/multipart/complete

Finalize the upload.

**Request:**
```json
{
  "key": "videos/large-file.mp4",
  "uploadId": "abc123",
  "parts": [
    { "etag": "\"abc123\"", "partNumber": 1 },
    { "etag": "\"def456\"", "partNumber": 2 }
  ]
}
```

**Response:**
```json
{ "success": true }
```

---

## Share Links

### POST /api/buckets/[bucket]/shares

Create a share link.

**Request:**
```json
{
  "key": "photos/image.png",
  "expiresInSeconds": 604800,
  "maxDownloads": 10
}
```

**Response:**
```json
{
  "shareId": "a1b2c3d4e5",
  "url": "https://r2.example.com/share/a1b2c3d4e5"
}
```

### GET /api/buckets/[bucket]/shares

List all share links for a bucket.

**Response:**
```json
{
  "shares": [
    {
      "id": "a1b2c3d4e5",
      "bucket": "WEBSITE_ASSETS",
      "key": "photos/image.png",
      "expiresAt": "2026-04-20T12:00:00Z",
      "maxDownloads": 10,
      "currentDownloads": 3,
      "createdBy": "user@example.com",
      "createdAt": "2026-04-13T12:00:00Z"
    }
  ]
}
```

### DELETE /api/buckets/[bucket]/share/[shareId]

Delete a share link.

**Response:**
```json
{ "success": true }
```

---

## Public Share Download

### GET /share/[shareId]

Download a shared file. **No authentication required.**

Searches all buckets for the share metadata, validates expiry and download limits, increments the download counter, and streams the file.

**Response:** File stream with `Content-Disposition: attachment` header.

**Errors:**
- `404` -- Share link not found or file deleted
- `410` -- Share expired or download limit reached

---

## AI — Semantic Search

### GET /api/search

Semantically rank files in a bucket against a natural-language query.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `bucket` | string | required | R2 binding name |
| `q` | string | required | Query (1–200 chars) |
| `limit` | number | `20` | Max results (1–50) |

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "key": "reports/Q3-earnings.pdf",
      "score": 0.79,
      "name": "Q3-earnings.pdf",
      "size": 204800,
      "modified": "2026-04-10T12:00:00Z",
      "bucket": "EXPLORER_TEST"
    }
  ],
  "query": "quarterly earnings",
  "count": 1
}
```

**Example:**
```bash
curl "https://r2.example.com/api/search?bucket=EXPLORER_TEST&q=quarterly+earnings&limit=10"
```

**Errors:** `400 INVALID_QUERY`, `404 BUCKET_NOT_FOUND`, `502 AI_UPSTREAM` / `VECTOR_UPSTREAM`, `500 INTERNAL`

---

## AI — File Chat

### POST /api/chat/[bucket]/[...key]

Ask questions about a file's contents. Response is a **Server-Sent Events** stream.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Summarise the key findings" }
  ]
}
```

**Response:** `Content-Type: text/event-stream`

Each event:
```
data: {"token":"..."}

data: [DONE]
```

**Example:**
```bash
curl -X POST "https://r2.example.com/api/chat/EXPLORER_TEST/reports/Q3-earnings.pdf" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What are the key numbers?"}]}'
```

**Errors:** `400 INVALID_REQUEST`, `404 OBJECT_NOT_FOUND`, `415 UNSUPPORTED_TYPE`, `502 AI_UPSTREAM`, `500 INTERNAL`

---

## Activity Audit Log

### GET /api/activity

Query the D1 activity log. Every R2 mutation (upload, delete, move, copy, folder create, share create/revoke) is recorded with a timestamp and the Cloudflare Access user email.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `bucket` | string | -- | Filter by bucket name |
| `action` | string | -- | One of `upload`, `delete`, `move`, `copy`, `folder-create`, `share-create`, `share-revoke` |
| `user` | string | -- | Filter by user email |
| `from` | string | -- | ISO-8601 lower bound on `ts` |
| `to` | string | -- | ISO-8601 upper bound on `ts` |
| `limit` | number | `20` | Page size (1–100) |
| `cursor` | string | -- | Opaque base64url cursor from a previous response's `nextCursor` |

**Response:**
```json
{
  "success": true,
  "rows": [
    {
      "id": 42,
      "ts": "2026-04-17T00:00:00Z",
      "userEmail": "a@x",
      "action": "upload",
      "bucket": "b",
      "objectKey": "k",
      "metadata": { "size": 123 }
    }
  ],
  "nextCursor": "base64url..."
}
```

**Example:**
```bash
curl "https://r2.example.com/api/activity?bucket=EXPLORER_TEST&action=upload&limit=10"
```

**Errors:** `400 { "error": "invalid query" }` (Zod validation failed), `400 { "error": "invalid cursor" }` (cursor couldn't decode)

---

## Analytics Dashboard

### GET /api/analytics

Aggregated dashboard payload that powers the `/analytics` page: per-bucket storage totals, top 10 accessed files, last 30 days of activity, and the 20 most recent events. No query parameters — the endpoint returns a single snapshot.

**Response:**
```json
{
  "success": true,
  "totalsByBucket": [
    { "bucket": "EXPLORER_TEST", "objects": 142, "bytes": 10485760 }
  ],
  "topFiles": [
    {
      "bucket": "EXPLORER_TEST",
      "objectKey": "reports/q1.pdf",
      "count": 37,
      "lastTs": "2026-04-18T23:11:02Z"
    }
  ],
  "daily": [
    { "day": "2026-04-18", "action": "upload", "count": 12 }
  ],
  "recent": [
    {
      "id": 42,
      "ts": "2026-04-17T00:00:00Z",
      "userEmail": "a@x",
      "action": "upload",
      "bucket": "EXPLORER_TEST",
      "objectKey": "reports/q1.pdf",
      "metadata": { "size": 123 }
    }
  ]
}
```

- `totalsByBucket` — one row per configured R2 bucket.
- `topFiles` — up to 10, ranked by event count across all recorded actions.
- `daily` — last 30 days, one row per `(day, action)` pair (missing days/actions are omitted).
- `recent` — up to 20 rows, same shape as `/api/activity` rows.

**Example:**
```bash
curl "https://r2.example.com/api/analytics"
```

**Notes:**
- `totalsByBucket` comes from `bucket.list()` pagination (not D1) and is memoized in-memory per-Worker-isolate for 60 seconds to avoid re-scanning on every page load.
- Rows 2–4 (`topFiles`, `daily`, `recent`) are sourced from the D1 `activity` table. For filtered / paginated access to the same underlying events, use [`/api/activity`](#get-apiactivity).

**Errors:** `500 { "success": false, "error": "analytics unavailable" }` — D1 query or bucket list failed; details logged server-side.

---

## AI — Admin Reindex

### POST /api/admin/[bucket]/reindex

Paginate through all objects in a bucket and (re-)index them in Vectorize. Runs synchronously — expect a slow response for large buckets.

**Response:**
```json
{ "success": true, "indexed": 142, "skipped": 3, "errors": 0 }
```

**Example:**
```bash
curl -X POST "https://r2.example.com/api/admin/EXPLORER_TEST/reindex"
```

**Errors:** `404 BUCKET_NOT_FOUND`, `502 AI_UPSTREAM` / `VECTOR_UPSTREAM`, `500 INTERNAL`

---

## Error Format

All errors return:
```json
{ "error": "Description of what went wrong" }
```

Common status codes:
| Code | Meaning |
|------|---------|
| 400 | Missing or invalid request fields |
| 404 | Resource not found |
| 410 | Share expired or download limit reached |
| 500 | Server error |
