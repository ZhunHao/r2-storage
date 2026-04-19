import { getBucket, getEnv } from "@/lib/r2";
import { NextResponse } from "next/server";

// POST: Upload a part of a multipart upload
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const uploadId = url.searchParams.get("uploadId");
    const partNumber = parseInt(url.searchParams.get("partNumber") ?? "", 10);

    if (!key || !uploadId || isNaN(partNumber)) {
      return NextResponse.json(
        { error: "Missing key, uploadId, or partNumber" },
        { status: 400 }
      );
    }

    const body = await request.arrayBuffer();

    const multipartUpload = bucket.resumeMultipartUpload(key, uploadId);
    const part = await multipartUpload.uploadPart(partNumber, body);

    return NextResponse.json({
      etag: part.etag,
      partNumber: part.partNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
