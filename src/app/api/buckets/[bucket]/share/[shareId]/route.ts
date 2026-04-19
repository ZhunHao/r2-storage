import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// DELETE: Remove a share link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bucket: string; shareId: string }> }
) {
  try {
    const { bucket: bucketName, shareId } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    await bucket.delete(`.r2-storage/shares/${shareId}.json`);

    ctx.waitUntil(
      recordActivity(env as unknown as AuditEnv, request, {
        action: "share-revoke",
        bucket: bucketName,
        objectKey: null,
        metadata: { shareId },
      }),
    );
    await invalidateListCache(env as unknown as KvEnv, bucketName);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
