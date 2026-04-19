import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { getContentType } from "@/lib/file-utils";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as { path: string };
    const { path } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Missing path" },
        { status: 400 }
      );
    }

    const contentType = getContentType(path);
    await bucket.put(path, new ArrayBuffer(0), {
      httpMetadata: { contentType },
    });

    await invalidateListCache(env as unknown as KvEnv, bucketName);

    return NextResponse.json({ success: true, path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
