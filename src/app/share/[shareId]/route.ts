import { discoverBuckets, getBucket, getEnv } from "@/lib/r2";
import { getFileName } from "@/lib/file-utils";
import type { ShareMetadata } from "@/types";
import { NextResponse } from "next/server";

// GET: Public share access — NO auth required
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const env = await getEnv();
    const bucketNames = discoverBuckets(env);

    // Search all buckets for the share metadata
    let metadata: ShareMetadata | null = null;
    let sourceBucket: R2Bucket | null = null;

    for (const name of bucketNames) {
      const bucket = getBucket(env, name);
      const obj = await bucket.get(`.r2-storage/shares/${shareId}.json`);
      if (obj) {
        metadata = JSON.parse(await obj.text()) as ShareMetadata;
        sourceBucket = bucket;
        break;
      }
    }

    if (!metadata || !sourceBucket) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      );
    }

    // Check expiry
    if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
      return NextResponse.json(
        { error: "Share link has expired" },
        { status: 410 }
      );
    }

    // Check download limit
    if (
      metadata.maxDownloads &&
      metadata.currentDownloads >= metadata.maxDownloads
    ) {
      return NextResponse.json(
        { error: "Download limit reached" },
        { status: 410 }
      );
    }

    // Get the shared file
    const object = await sourceBucket.get(metadata.key);
    if (!object) {
      return NextResponse.json(
        { error: "Shared file no longer exists" },
        { status: 404 }
      );
    }

    // Increment download count
    const updatedMetadata = {
      ...metadata,
      currentDownloads: metadata.currentDownloads + 1,
    };
    await sourceBucket.put(
      `.r2-storage/shares/${shareId}.json`,
      JSON.stringify(updatedMetadata),
      { httpMetadata: { contentType: "application/json" } }
    );

    // Stream the file
    const filename = getFileName(metadata.key);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ?? "application/octet-stream"
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    if (object.size) {
      headers.set("Content-Length", String(object.size));
    }

    return new Response(object.body, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
