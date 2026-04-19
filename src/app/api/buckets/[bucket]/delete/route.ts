import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { indexOnDelete, type IndexEnv } from "@/lib/indexing";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// POST: Delete an object or folder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as { key: string };
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Missing key" },
        { status: 400 }
      );
    }

    // If it's a folder, recursively delete all objects with that prefix
    if (key.endsWith("/")) {
      const toDelete: string[] = [];
      let cursor: string | undefined;

      do {
        const listed = await bucket.list({ prefix: key, cursor });
        toDelete.push(...listed.objects.map((o) => o.key));
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      // Also delete the folder marker itself
      toDelete.push(key);

      // Delete in batches (R2 supports deleting multiple keys)
      for (let i = 0; i < toDelete.length; i += 1000) {
        const batch = toDelete.slice(i, i + 1000);
        await Promise.all(batch.map((k) => bucket.delete(k)));
      }

      ctx.waitUntil(indexOnDelete(env as unknown as IndexEnv, bucketName, toDelete));
      ctx.waitUntil(
        recordActivity(env as unknown as AuditEnv, request, {
          action: "delete",
          bucket: bucketName,
          objectKey: key,
          metadata: { prefix: key, deletedCount: toDelete.length },
        }),
      );
      await invalidateListCache(env as unknown as KvEnv, bucketName);
    } else {
      await bucket.delete(key);

      ctx.waitUntil(indexOnDelete(env as unknown as IndexEnv, bucketName, [key]));
      ctx.waitUntil(
        recordActivity(env as unknown as AuditEnv, request, {
          action: "delete",
          bucket: bucketName,
          objectKey: key,
          metadata: {},
        }),
      );
      await invalidateListCache(env as unknown as KvEnv, bucketName);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
