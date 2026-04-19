/**
 * Typed wrapper over the Vectorize binding.
 * One index serves all R2 buckets; bucket is part of the id and metadata.
 */

export interface FileVectorMetadata
  extends Record<string, VectorizeVectorMetadataValue> {
  bucket: string;
  key: string;
  name: string;
  folderPath: string;
  size: number;
  contentType: string;
  modified: string;
  embedVersion: "v1";
}

export interface FileVector {
  id: string;
  values: number[];
  metadata: FileVectorMetadata;
}

const DELIMITER = "::";

export function vectorId(bucket: string, key: string): string {
  return `${bucket}${DELIMITER}${key}`;
}

export function parseVectorId(
  id: string
): { bucket: string; key: string } | null {
  const idx = id.indexOf(DELIMITER);
  if (idx === -1) return null;
  return { bucket: id.slice(0, idx), key: id.slice(idx + DELIMITER.length) };
}

export interface VectorEnv {
  VECTOR_INDEX: VectorizeIndex;
}

export async function upsert(
  env: VectorEnv,
  vectors: FileVector[]
): Promise<void> {
  if (vectors.length === 0) return;
  // Vectorize accepts up to 1000 vectors per call.
  for (let i = 0; i < vectors.length; i += 1000) {
    await env.VECTOR_INDEX.upsert(vectors.slice(i, i + 1000));
  }
}

export async function deleteByIds(
  env: VectorEnv,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += 1000) {
    await env.VECTOR_INDEX.deleteByIds(ids.slice(i, i + 1000));
  }
}

export interface QueryOptions {
  topK?: number;
  bucket?: string;
}

export async function query(
  env: VectorEnv,
  values: number[],
  opts: QueryOptions = {}
): Promise<{ id: string; score: number; metadata: FileVectorMetadata }[]> {
  const topK = Math.min(Math.max(opts.topK ?? 20, 1), 50);
  const filter = opts.bucket ? { bucket: opts.bucket } : undefined;
  const result = await env.VECTOR_INDEX.query(values, {
    topK,
    returnMetadata: "all",
    ...(filter ? { filter } : {}),
  });
  return result.matches.map((m) => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata as FileVectorMetadata,
  }));
}
