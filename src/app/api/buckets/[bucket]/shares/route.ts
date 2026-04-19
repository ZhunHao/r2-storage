import { getBucket, getEnv, getEnvAndCtx } from "@/lib/r2";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import type { ShareMetadata } from "@/types";
import { NextResponse } from "next/server";

// GET: List all share links for a bucket
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    const listed = await bucket.list({ prefix: ".r2-storage/shares/" });
    const shares: ShareMetadata[] = [];

    for (const obj of listed.objects) {
      try {
        const shareObj = await bucket.get(obj.key);
        if (shareObj) {
          const text = await shareObj.text();
          shares.push(JSON.parse(text) as ShareMetadata);
        }
      } catch {
        // Skip malformed share files
      }
    }

    return NextResponse.json({ shares });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Create a share link (key provided in body)
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
      expiresInSeconds?: number;
      maxDownloads?: number;
    };

    const { key } = body;
    if (!key) {
      return NextResponse.json(
        { error: "Missing key" },
        { status: 400 }
      );
    }

    // Verify object exists
    const head = await bucket.head(key);
    if (!head) {
      return NextResponse.json(
        { error: "Object not found" },
        { status: 404 }
      );
    }

    const shareId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

    const metadata = {
      id: shareId,
      bucket: bucketName,
      key,
      expiresAt: body.expiresInSeconds
        ? Date.now() + body.expiresInSeconds * 1000
        : undefined,
      maxDownloads: body.maxDownloads,
      currentDownloads: 0,
      createdBy: "anonymous",
      createdAt: Date.now(),
    };

    await bucket.put(
      `.r2-storage/shares/${shareId}.json`,
      JSON.stringify(metadata),
      { httpMetadata: { contentType: "application/json" } }
    );

    ctx.waitUntil(
      recordActivity(env as unknown as AuditEnv, request, {
        action: "share-create",
        bucket: bucketName,
        objectKey: key,
        metadata: { shareId, expiresAt: metadata.expiresAt },
      }),
    );
    await invalidateListCache(env as unknown as KvEnv, bucketName);

    const url = new URL(request.url);
    const shareUrl = `${url.origin}/share/${shareId}`;

    return NextResponse.json({ shareId, url: shareUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
