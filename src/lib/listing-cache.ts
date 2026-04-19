import type { R2HttpMetadata } from "@/types/index";

// Mirrors the GET /api/buckets/[bucket] response shape exactly so the cache
// can be returned to clients verbatim without re-serialization.
//
// NOTE: bump `CACHE_VERSION` below whenever this shape changes in a
// breaking way — old-shape entries are served verbatim until TTL expiry,
// so a schema drift without a version bump can ship stale data to clients
// expecting the new shape.
export interface CachedListPayload {
  objects: Array<{
    key: string;
    size: number;
    uploaded: string; // ISO-8601
    httpMetadata?: R2HttpMetadata;
    customMetadata?: Record<string, string>;
  }>;
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
}

export interface CacheKeyParts {
  bucket: string;
  prefix?: string;
  delimiter?: string;
  cursor?: string;
  limit: number;
}

export type KvEnv = { LISTINGS_KV: KVNamespace };

export const CACHE_VERSION = "v1";
export const CACHE_TTL_SECONDS = 60;

export function buildCacheKey(parts: CacheKeyParts): string {
  const prefix = encodePrefix(parts.prefix);
  const delimiter = parts.delimiter ?? "/";
  const cursor = parts.cursor ?? "";
  return `list:${CACHE_VERSION}:${parts.bucket}:${prefix}:${delimiter}:${parts.limit}:${cursor}`;
}

// Preserve key-safe chars (incl. "/") when no encoding is needed; fully
// URL-encode otherwise so special characters can't corrupt the colon-delimited
// cache key.
const KEY_SAFE = /^[A-Za-z0-9/\-_.]*$/;

// Plan's literal encodeURIComponent(prefix) can't satisfy both test fixtures
// (test 2 expects "docs/" preserved; test 3 expects "a b/" -> "a%20b%2F").
// We preserve URL-safe chars (incl. "/") and only encode special chars.
// Collision-free because any encoded output contains "%" which the key-safe
// set excludes, and ":" always encodes to "%3A", preventing segment-delimiter
// corruption.
function encodePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  return KEY_SAFE.test(prefix) ? prefix : encodeURIComponent(prefix);
}

export async function getCachedList(env: KvEnv, key: string): Promise<CachedListPayload | null> {
  try {
    return await env.LISTINGS_KV.get<CachedListPayload>(key, "json");
  } catch (err) {
    console.error("[listing-cache] getCachedList failed", err);
    return null;
  }
}

export async function putCachedList(
  env: KvEnv,
  key: string,
  payload: CachedListPayload,
): Promise<void> {
  try {
    await env.LISTINGS_KV.put(key, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[listing-cache] putCachedList failed", err);
  }
}

export async function invalidateListCache(env: KvEnv, bucket: string): Promise<void> {
  try {
    const prefix = bucketPrefixPattern(bucket);
    let cursor: string | undefined;
    const keys: string[] = [];
    do {
      const page = await env.LISTINGS_KV.list({ prefix, cursor });
      for (const k of page.keys) keys.push(k.name);
      if (!page.list_complete) {
        if (!page.cursor) {
          console.warn(
            "[listing-cache] list returned incomplete page without cursor — stopping",
          );
          break;
        }
        cursor = page.cursor;
      } else {
        cursor = undefined;
      }
    } while (cursor);
    await Promise.allSettled(keys.map((k) => env.LISTINGS_KV.delete(k)));
  } catch (err) {
    console.error("[listing-cache] invalidateListCache failed", err);
  }
}

export function bucketPrefixPattern(bucket: string): string {
  return `list:${CACHE_VERSION}:${bucket}:`;
}
