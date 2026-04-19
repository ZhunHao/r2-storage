import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// POST: Create a folder (zero-byte object with trailing slash)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as { path: string };
    let { path } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Missing path" },
        { status: 400 }
      );
    }

    // Ensure trailing slash
    if (!path.endsWith("/")) {
      path = `${path}/`;
    }

    await bucket.put(path, new ArrayBuffer(0));

    ctx.waitUntil(
      recordActivity(env as unknown as AuditEnv, request, {
        action: "folder-create",
        bucket: bucketName,
        objectKey: path,
      }),
    );
    await invalidateListCache(env as unknown as KvEnv, bucketName);

    return NextResponse.json({ success: true, path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
