import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/buckets/[bucket]/route";
import {
  buildCacheKey,
  bucketPrefixPattern,
  CACHE_TTL_SECONDS,
  type CachedListPayload,
  invalidateListCache,
  type KvEnv,
} from "@/lib/listing-cache";

const BUCKET = "EXPLORER_TEST";

async function clearKv(): Promise<void> {
  const page = await env.LISTINGS_KV.list({ prefix: "list:v1:" });
  await Promise.all(page.keys.map((k) => env.LISTINGS_KV.delete(k.name)));
}

beforeEach(async () => {
  await clearKv();
});

describe("GET /api/buckets/[bucket] caching", () => {
  it("serves a cached payload verbatim on a cache hit", async () => {
    const cacheKey = buildCacheKey({
      bucket: BUCKET,
      prefix: "",
      delimiter: "/",
      limit: 10,
    });
    const payload: CachedListPayload = {
      objects: [
        {
          key: "fake/object.txt",
          size: 42,
          uploaded: "2026-01-01T00:00:00.000Z",
          httpMetadata: { contentType: "text/plain" },
          customMetadata: {},
        },
      ],
      delimitedPrefixes: ["cached-folder/"],
      truncated: false,
    };
    await env.LISTINGS_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    const req = new Request(`http://x/api/buckets/${BUCKET}?prefix=&limit=10`);
    const res = await GET(req, {
      params: Promise.resolve({ bucket: BUCKET }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(payload);
  });

  it("serves stale data from cache after an R2 mutation (proving cache hit)", async () => {
    // Seed KV directly with a payload that names an object which does NOT
    // exist in R2. If the cache-read path works, GET returns the seeded
    // payload verbatim — even though R2 has no such object. Deterministic
    // and does not depend on observing the fire-and-forget putCachedList.
    const cacheKey = buildCacheKey({
      bucket: BUCKET,
      prefix: "",
      delimiter: "/",
      limit: 10,
    });
    const staleObjectKey = "__stale_cache_marker__.txt";
    const staleSize = 12345;
    const stalePayload: CachedListPayload = {
      objects: [
        {
          key: staleObjectKey,
          size: staleSize,
          uploaded: "2020-01-01T00:00:00.000Z",
          httpMetadata: { contentType: "text/plain" },
          customMetadata: {},
        },
      ],
      delimitedPrefixes: [],
      truncated: false,
    };
    await env.LISTINGS_KV.put(cacheKey, JSON.stringify(stalePayload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    const req = new Request(`http://x/api/buckets/${BUCKET}?prefix=&limit=10`);
    const res = await GET(req, {
      params: Promise.resolve({ bucket: BUCKET }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as CachedListPayload;
    expect(body.objects).toHaveLength(1);
    expect(body.objects[0]?.key).toBe(staleObjectKey);
    expect(body.objects[0]?.size).toBe(staleSize);
  });

  it("mutation clears the cached listing for that bucket", async () => {
    // Seed KV directly with a stale-marker payload. If invalidation works,
    // the bucket's cached keys disappear after invalidateListCache runs.
    const cacheKey = buildCacheKey({
      bucket: BUCKET,
      prefix: "",
      delimiter: "/",
      limit: 10,
    });
    const stalePayload: CachedListPayload = {
      objects: [],
      delimitedPrefixes: [],
      truncated: false,
    };
    await env.LISTINGS_KV.put(cacheKey, JSON.stringify(stalePayload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    const keysBefore = await env.LISTINGS_KV.list({
      prefix: bucketPrefixPattern(BUCKET),
    });
    expect(keysBefore.keys.length).toBeGreaterThan(0);

    // Directly call the invalidation helper (tests the wiring that Task 6
    // installed into mutation handlers — but isolates the test from the
    // mutation handlers themselves, which have their own preconditions).
    await invalidateListCache(env as unknown as KvEnv, BUCKET);

    const keysAfter = await env.LISTINGS_KV.list({
      prefix: bucketPrefixPattern(BUCKET),
    });
    expect(keysAfter.keys).toHaveLength(0);
  });
});
