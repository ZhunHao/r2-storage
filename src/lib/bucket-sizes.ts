import { discoverBuckets, getBucket } from "@/lib/r2";
import type { BucketTotal } from "@/types/analytics";

type CacheEntry = { ts: number; value: BucketTotal };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function totalForBucket(
  env: Record<string, unknown>,
  name: string
): Promise<BucketTotal> {
  const cached = cache.get(name);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.value;

  try {
    const bucket = getBucket(env, name);
    let cursor: string | undefined;
    let objects = 0;
    let bytes = 0;
    do {
      const page = await bucket.list({ cursor, limit: 1000 });
      for (const obj of page.objects) {
        objects += 1;
        bytes += obj.size;
      }
      if (page.truncated) {
        if (!page.cursor) {
          throw new Error(
            `bucket.list returned truncated=true without cursor for ${name}`
          );
        }
        cursor = page.cursor;
      } else {
        cursor = undefined;
      }
    } while (cursor);

    const value: BucketTotal = { bucket: name, objects, bytes };
    cache.set(name, { ts: Date.now(), value });
    return value;
  } catch (err) {
    console.error("[bucket-sizes] scan failed for", name, err);
    return { bucket: name, objects: 0, bytes: 0 };
  }
}

export async function computeBucketTotals(
  env: Record<string, unknown>
): Promise<BucketTotal[]> {
  const names = discoverBuckets(env);
  return Promise.all(names.map((n) => totalForBucket(env, n)));
}
