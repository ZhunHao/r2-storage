import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { indexOnDelete, indexOnWrite, type IndexEnv } from "@/lib/indexing";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// POST: Move (rename) an object — copy then delete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as {
      sourceKey: string;
      destinationKey: string;
    };
    const { sourceKey, destinationKey } = body;

    if (!sourceKey || !destinationKey) {
      return NextResponse.json(
        { error: "Missing sourceKey or destinationKey" },
        { status: 400 }
      );
    }

    const object = await bucket.get(sourceKey);
    if (!object) {
      return NextResponse.json(
        { error: "Source object not found" },
        { status: 404 }
      );
    }

    const putResult = await bucket.put(destinationKey, await object.arrayBuffer(), {
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    });

    await bucket.delete(sourceKey);

    if (putResult) {
      ctx.waitUntil(indexOnWrite(env as unknown as IndexEnv, bucketName, destinationKey, putResult));
      ctx.waitUntil(
        recordActivity(env as unknown as AuditEnv, request, {
          action: "move",
          bucket: bucketName,
          objectKey: destinationKey,
          metadata: { from: sourceKey, to: destinationKey },
        }),
      );
    }
    ctx.waitUntil(indexOnDelete(env as unknown as IndexEnv, bucketName, [sourceKey]));
    // Invalidate regardless of putResult: bucket.delete above already mutated R2.
    await invalidateListCache(env as unknown as KvEnv, bucketName);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
