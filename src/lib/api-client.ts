/**
 * Client-side API wrapper for R2 storage operations.
 */

import type {
  ListObjectsResponse,
  R2HttpMetadata,
  SemanticSearchResponse,
  ServerConfig,
  ShareMetadata,
} from "@/types";
import type { BucketTotal } from "@/types/analytics";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new ApiError(
      `API error: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }

  return res.json() as Promise<T>;
}

// Server config
export function fetchServerConfig(): Promise<ServerConfig> {
  return request<ServerConfig>("/api/server/config");
}

// List objects in a bucket
export function listObjects(
  bucket: string,
  prefix?: string,
  cursor?: string,
  limit = 1000
): Promise<ListObjectsResponse> {
  const params = new URLSearchParams();
  if (prefix) params.set("prefix", prefix);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  params.set("delimiter", "/");

  return request<ListObjectsResponse>(
    `/api/buckets/${bucket}?${params.toString()}`
  );
}

// Recursive bucket totals (objects + bytes across the whole bucket)
export function fetchBucketTotal(bucket: string): Promise<BucketTotal> {
  return request<BucketTotal>(`/api/buckets/${bucket}/total`);
}

// Download a file (returns Response for streaming)
export async function downloadObject(
  bucket: string,
  key: string
): Promise<Response> {
  const encodedKey = encodeURIComponent(key);
  const res = await fetch(`/api/buckets/${bucket}/object/${encodedKey}`);
  if (!res.ok) {
    throw new ApiError(`Download failed: ${res.statusText}`, res.status);
  }
  return res;
}

async function readBodyWithCap(
  res: Response,
  maxBytes: number,
  errorLabel: string
): Promise<Uint8Array> {
  if (!res.body) {
    throw new Error("Response has no body");
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(
        `File too large for ${errorLabel} (over ${(maxBytes / 1024 / 1024).toFixed(0)} MB, max ${maxBytes / 1024 / 1024} MB)`
      );
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Fetch an object's body as text. Rejects bodies larger than `maxBytes`
 * (default 5 MB) to keep text previews bounded. Uses a streaming cap so the
 * check works whether Content-Length is present or stripped by chunked
 * transfer encoding.
 */
export async function fetchObjectText(
  bucket: string,
  key: string,
  maxBytes: number = 5 * 1024 * 1024
): Promise<string> {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`/api/buckets/${bucket}/object/${encoded}`);
  if (!res.ok) {
    throw new Error(`Failed to load file: ${res.status} ${res.statusText}`);
  }
  const rawLength = res.headers.get("Content-Length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new Error(
        `File too large for text preview (${(length / 1024 / 1024).toFixed(1)} MB, max ${maxBytes / 1024 / 1024} MB)`
      );
    }
  }
  const bytes = await readBodyWithCap(res, maxBytes, "text preview");
  return new TextDecoder().decode(bytes);
}

/**
 * Fetch an object's body as an ArrayBuffer. Used for gzip previews that
 * need binary data before decompression. Enforces the same size cap via
 * streaming so missing Content-Length does not produce a false positive.
 */
export async function fetchObjectArrayBuffer(
  bucket: string,
  key: string,
  maxBytes: number = 5 * 1024 * 1024
): Promise<ArrayBuffer> {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`/api/buckets/${bucket}/object/${encoded}`);
  if (!res.ok) {
    throw new Error(`Failed to load file: ${res.status} ${res.statusText}`);
  }
  const rawLength = res.headers.get("Content-Length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new Error(
        `File too large for preview (${(length / 1024 / 1024).toFixed(1)} MB, max ${maxBytes / 1024 / 1024} MB)`
      );
    }
  }
  const bytes = await readBodyWithCap(res, maxBytes, "preview");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

// Upload a single file
export async function uploadObject(
  bucket: string,
  key: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new ApiError("Upload failed", xhr.status));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new ApiError("Upload network error", 0));
    });

    xhr.open("POST", `/api/buckets/${bucket}`);
    xhr.send(formData);
  });
}

// Create a folder
export function createFolder(
  bucket: string,
  path: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buckets/${bucket}/folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

// Create an empty file
export function createEmptyFile(
  bucket: string,
  path: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buckets/${bucket}/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

// Delete an object
export function deleteObject(
  bucket: string,
  key: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buckets/${bucket}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

// Move an object
export function moveObject(
  bucket: string,
  sourceKey: string,
  destinationKey: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buckets/${bucket}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destinationKey }),
  });
}

// Copy an object
export function copyObject(
  bucket: string,
  sourceKey: string,
  destinationKey: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buckets/${bucket}/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destinationKey }),
  });
}

// Multipart upload
export function createMultipartUpload(
  bucket: string,
  key: string
): Promise<{ uploadId: string }> {
  return request<{ uploadId: string }>(
    `/api/buckets/${bucket}/multipart/create`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }
  );
}

export async function uploadPart(
  bucket: string,
  key: string,
  uploadId: string,
  partNumber: number,
  body: Blob
): Promise<{ etag: string; partNumber: number }> {
  const params = new URLSearchParams({
    key,
    uploadId,
    partNumber: String(partNumber),
  });

  const res = await fetch(
    `/api/buckets/${bucket}/multipart/upload?${params.toString()}`,
    {
      method: "POST",
      body,
    }
  );

  if (!res.ok) {
    throw new ApiError("Part upload failed", res.status);
  }

  return res.json() as Promise<{ etag: string; partNumber: number }>;
}

export function completeMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string,
  parts: { etag: string; partNumber: number }[]
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/api/buckets/${bucket}/multipart/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, parts }),
    }
  );
}

export interface BucketObject {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata?: R2HttpMetadata;
}

// List all objects in a bucket recursively (no delimiter — flat walk).
// Paginates via R2 cursor until the listing is exhausted.
export async function listAllObjects(
  bucket: string,
  prefix = ""
): Promise<BucketObject[]> {
  const all: BucketObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set("prefix", prefix);
    params.set("limit", "1000");
    params.set("delimiter", ""); // recursive — no folder grouping
    if (cursor) params.set("cursor", cursor);

    const res = await request<ListObjectsResponse>(
      `/api/buckets/${bucket}?${params.toString()}`
    );

    for (const obj of res.objects) {
      all.push({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
      });
    }

    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  return all;
}

// Semantic search
export function searchSemantic(
  bucket: string,
  query: string,
  limit = 20
): Promise<SemanticSearchResponse> {
  const params = new URLSearchParams({ bucket, q: query, limit: String(limit) });
  return request<SemanticSearchResponse>(`/api/search?${params.toString()}`);
}

// Share links
export function createShareLink(
  bucket: string,
  key: string,
  options?: {
    expiresInSeconds?: number;
    maxDownloads?: number;
  }
): Promise<{ shareId: string; url: string }> {
  return request<{ shareId: string; url: string }>(
    `/api/buckets/${bucket}/shares`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...options }),
    }
  );
}

export function listShares(
  bucket: string
): Promise<{ shares: ShareMetadata[] }> {
  return request<{ shares: ShareMetadata[] }>(
    `/api/buckets/${bucket}/shares`
  );
}

export function deleteShare(
  bucket: string,
  shareId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/api/buckets/${bucket}/share/${shareId}`,
    { method: "DELETE" }
  );
}
