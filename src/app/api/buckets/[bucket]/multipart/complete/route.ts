import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { indexOnWrite, type IndexEnv } from "@/lib/indexing";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// POST: Complete a multipart upload
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as {
      key: string;
      uploadId: string;
      parts: { etag: string; partNumber: number }[];
    };
    const { key, uploadId, parts } = body;

    if (!key || !uploadId || !parts?.length) {
      return NextResponse.json(
        { error: "Missing key, uploadId, or parts" },
        { status: 400 }
      );
    }

    const multipartUpload = bucket.resumeMultipartUpload(key, uploadId);
    const completedObject = await multipartUpload.complete(
      parts.map((p) => ({
        etag: p.etag,
        partNumber: p.partNumber,
      }))
    );

    if (completedObject) {
      ctx.waitUntil(indexOnWrite(env as unknown as IndexEnv, bucketName, key, completedObject));
      ctx.waitUntil(
        recordActivity(env as unknown as AuditEnv, request, {
          action: "upload",
          bucket: bucketName,
          objectKey: key,
          metadata: { multipart: true, size: completedObject.size },
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
