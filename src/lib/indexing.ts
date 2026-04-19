/**
 * Compose AI embedding + Vectorize upsert/delete into single helpers
 * called from R2 mutation handlers.
 *
 * NEVER throws. Logs failures with `console.error("[index] ...")`.
 * Indexing failure must not break the R2 mutation it's attached to.
 *
 * PHASE-1-DECISION (Task 0): ctx.waitUntil IS reachable in both `pnpm dev`
 * and `pnpm preview`. Mutation handlers (Tasks 8-12) wrap calls in
 * `ctx.waitUntil(indexOnWrite(...))` so uploads return instantly.
 * The functions themselves remain awaitable Promises.
 */

import { embed, type AiEnv } from "@/lib/ai";
import { basename, dirname } from "@/lib/path-utils";
import {
  deleteByIds,
  upsert,
  vectorId,
  type FileVector,
  type VectorEnv,
} from "@/lib/vectorize";

export type IndexEnv = AiEnv & VectorEnv;

export function shouldSkip(key: string): boolean {
  if (key.endsWith("/")) return true;
  if (key.startsWith(".r2-storage/")) return true;
  return false;
}

export function buildEmbedInput(key: string, contentType: string): string {
  const name = basename(key).toLowerCase();
  const folder = dirname(key).replaceAll("/", " ").trim().toLowerCase();
  const ct = contentType.toLowerCase();
  return `v1:${name} ${folder} ${ct}`.slice(0, 256);
}

export async function indexOnWrite(
  env: IndexEnv,
  bucket: string,
  key: string,
  obj: { size: number; uploaded: Date; httpMetadata?: { contentType?: string } }
): Promise<void> {
  if (shouldSkip(key)) return;

  const contentType =
    obj.httpMetadata?.contentType ?? "application/octet-stream";
  const input = buildEmbedInput(key, contentType);

  try {
    const values = await embed(env, input);
    const vec: FileVector = {
      id: vectorId(bucket, key),
      values,
      metadata: {
        bucket,
        key,
        name: basename(key),
        folderPath: dirname(key),
        size: obj.size,
        contentType,
        modified: obj.uploaded.toISOString(),
        embedVersion: "v1",
      },
    };
    await upsert(env, [vec]);
  } catch (err) {
    console.error("[index] indexOnWrite failed", {
      bucket,
      key,
      err: String(err),
    });
  }
}

export async function indexOnDelete(
  env: IndexEnv,
  bucket: string,
  keys: string[]
): Promise<void> {
  const filtered = keys.filter((k) => !shouldSkip(k));
  if (filtered.length === 0) return;
  const ids = filtered.map((k) => vectorId(bucket, k));
  try {
    await deleteByIds(env, ids);
  } catch (err) {
    console.error("[index] indexOnDelete failed", {
      bucket,
      count: filtered.length,
      err: String(err),
    });
  }
}
