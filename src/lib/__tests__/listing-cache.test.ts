import { describe, expect, it } from "vitest";
import {
  buildCacheKey,
  CACHE_TTL_SECONDS,
  getCachedList,
  invalidateListCache,
  type KvEnv,
  putCachedList,
} from "@/lib/listing-cache";

describe("buildCacheKey", () => {
  it("encodes required fields in a deterministic order", () => {
    expect(buildCacheKey({ bucket: "b", limit: 100 }))
      .toBe("list:v1:b::/:100:");
  });

  it("includes prefix, delimiter, cursor", () => {
    expect(buildCacheKey({
      bucket: "b",
      prefix: "docs/",
      delimiter: "/",
      cursor: "abc",
      limit: 50,
    })).toBe("list:v1:b:docs/:/:50:abc");
  });

  it("URL-encodes special characters in prefix", () => {
    expect(buildCacheKey({ bucket: "b", prefix: "a b/", limit: 10 }))
      .toBe("list:v1:b:a%20b%2F:/:10:");
  });
});

describe("getCachedList / putCachedList", () => {
  it("getCachedList returns null and never throws on KV error", async () => {
    const env = { LISTINGS_KV: { get: async () => { throw new Error("boom"); } } } as unknown as KvEnv;
    await expect(getCachedList(env, "k")).resolves.toBeNull();
  });

  it("putCachedList swallows KV errors", async () => {
    const env = { LISTINGS_KV: { put: async () => { throw new Error("boom"); } } } as unknown as KvEnv;
    await expect(putCachedList(env, "k", { objects: [], delimitedPrefixes: [], truncated: false })).resolves.toBeUndefined();
  });

  it("getCachedList returns parsed JSON on success", async () => {
    const payload = { objects: [], delimitedPrefixes: [], truncated: false };
    const env = { LISTINGS_KV: { get: async (_k: string, _t: string) => payload } } as unknown as KvEnv;
    const result = await getCachedList(env, "k");
    expect(result).toEqual(payload);
  });

  it("putCachedList writes JSON with expirationTtl", async () => {
    const calls: Array<{ key: string; value: string; options: unknown }> = [];
    const env = {
      LISTINGS_KV: {
        put: async (key: string, value: string, options: unknown) => {
          calls.push({ key, value, options });
        },
      },
    } as unknown as KvEnv;
    const payload = { objects: [], delimitedPrefixes: [], truncated: false };
    await putCachedList(env, "k", payload);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      key: "k",
      value: JSON.stringify(payload),
      options: { expirationTtl: CACHE_TTL_SECONDS },
    });
  });
});

describe("invalidateListCache", () => {
  it("deletes every key under the bucket prefix across pages", async () => {
    const deleted: string[] = [];
    const env = {
      LISTINGS_KV: {
        list: async ({ cursor }: { cursor?: string }) =>
          cursor === undefined
            ? { keys: [{ name: "list:v1:b:x" }, { name: "list:v1:b:y" }], list_complete: false, cursor: "c1" }
            : { keys: [{ name: "list:v1:b:z" }], list_complete: true, cursor: undefined },
        delete: async (k: string) => { deleted.push(k); },
      },
    } as unknown as KvEnv;
    await invalidateListCache(env, "b");
    expect(deleted.sort()).toEqual(["list:v1:b:x", "list:v1:b:y", "list:v1:b:z"]);
  });

  it("never throws on KV error", async () => {
    const env = { LISTINGS_KV: { list: async () => { throw new Error("boom"); } } } as unknown as KvEnv;
    await expect(invalidateListCache(env, "b")).resolves.toBeUndefined();
  });

  it("continues deleting remaining keys if one delete rejects", async () => {
    const deleted: string[] = [];
    let callIndex = 0;
    const env = {
      LISTINGS_KV: {
        list: async () => ({
          keys: [
            { name: "list:v1:b:x" },
            { name: "list:v1:b:y" },
            { name: "list:v1:b:z" },
          ],
          list_complete: true,
          cursor: undefined,
        }),
        delete: async (k: string) => {
          const i = callIndex++;
          if (i === 1) throw new Error("transient KV failure");
          deleted.push(k);
        },
      },
    } as unknown as KvEnv;
    await invalidateListCache(env, "b");
    expect(deleted.sort()).toEqual(["list:v1:b:x", "list:v1:b:z"]);
  });
});
