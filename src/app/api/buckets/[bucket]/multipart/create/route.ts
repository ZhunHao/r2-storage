import { getBucket, getEnv } from "@/lib/r2";
import { NextResponse } from "next/server";

// POST: Create a multipart upload
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    const body = (await request.json()) as {
      key: string;
      httpMetadata?: Record<string, string>;
    };
    const { key, httpMetadata } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Missing key" },
        { status: 400 }
      );
    }

    const upload = await bucket.createMultipartUpload(key, {
      httpMetadata: httpMetadata ?? {},
    });

    return NextResponse.json({
      uploadId: upload.uploadId,
      key: upload.key,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
