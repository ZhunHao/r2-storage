/**
 * Server-side R2 helpers for route handlers.
 * Access Cloudflare bindings via getCloudflareContext().
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Duck-type test for R2 bucket. Constructor-name check (`"R2Bucket"`) breaks
 * when bindings are accessed through OpenNext's remote-binding proxy
 * (which sets ctor name to `"constructor"`). We instead probe the R2 API
 * surface: every R2Bucket exposes get/put/list/delete/head and
 * createMultipartUpload.
 */
function looksLikeR2Bucket(value: unknown): value is R2Bucket {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.get === "function" &&
    typeof v.put === "function" &&
    typeof v.list === "function" &&
    typeof v.delete === "function" &&
    typeof v.head === "function" &&
    typeof v.createMultipartUpload === "function"
  );
}

/**
 * Discover all R2 buckets bound in the Worker environment.
 * Iterates env entries and probes each for the R2 API surface.
 */
export function discoverBuckets(env: Record<string, unknown>): string[] {
  return Object.entries(env)
    .filter(([key, value]) => key !== "ASSETS" && looksLikeR2Bucket(value))
    .map(([key]) => key);
}

/**
 * Get a specific R2 bucket by binding name.
 * Throws if the bucket is not found.
 */
export function getBucket(
  env: Record<string, unknown>,
  name: string
): R2Bucket {
  const bucket = env[name];
  if (!looksLikeR2Bucket(bucket)) {
    throw new Error(`Bucket "${name}" not found`);
  }
  return bucket;
}

/**
 * Get the Cloudflare environment from the request context.
 */
export async function getEnv(): Promise<Record<string, unknown>> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Record<string, unknown>;
}

/**
 * Get the Cloudflare environment + execution ctx (for waitUntil).
 * Use this in mutation handlers when indexing/cleanup should run in the
 * background without blocking the response.
 */
export async function getEnvAndCtx(): Promise<{
  env: Record<string, unknown>;
  ctx: { waitUntil: (p: Promise<unknown>) => void };
}> {
  const cf = await getCloudflareContext({ async: true });
  return {
    env: cf.env as unknown as Record<string, unknown>,
    ctx: cf.ctx as unknown as { waitUntil: (p: Promise<unknown>) => void },
  };
}
