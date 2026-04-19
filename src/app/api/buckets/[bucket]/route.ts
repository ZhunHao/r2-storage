import { getBucket, getEnvAndCtx } from "@/lib/r2";
import { indexOnWrite, type IndexEnv } from "@/lib/indexing";
import { recordActivity, type AuditEnv } from "@/lib/audit";
import {
  buildCacheKey,
  getCachedList,
  invalidateListCache,
  putCachedList,
  type CachedListPayload,
  type KvEnv,
} from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// GET: List objects in a bucket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const url = new URL(request.url);
    const prefix = url.searchParams.get("prefix") ?? "";
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const delimiter = url.searchParams.get("delimiter") ?? "/";
    const limit = parseInt(url.searchParams.get("limit") ?? "1000", 10);

    // Read-through cache: serve from KV on hit, otherwise list + populate.
    const kvEnv = env as unknown as KvEnv;
    const cacheKey = buildCacheKey({
      bucket: bucketName,
      prefix,
      cursor,
      delimiter,
      limit,
    });
    const cached = await getCachedList(kvEnv, cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const listed = await bucket.list({ prefix, cursor, delimiter, limit });

    const payload: CachedListPayload = {
      objects: listed.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        // Cloudflare's R2HTTPMetadata.cacheExpiry is a Date; our
        // CachedListPayload stores it as an ISO string (KV payloads must be
        // JSON-serializable and round-trip losslessly through getCachedList).
        httpMetadata: obj.httpMetadata && {
          contentType: obj.httpMetadata.contentType,
          contentLanguage: obj.httpMetadata.contentLanguage,
          contentDisposition: obj.httpMetadata.contentDisposition,
          contentEncoding: obj.httpMetadata.contentEncoding,
          cacheControl: obj.httpMetadata.cacheControl,
          cacheExpiry: obj.httpMetadata.cacheExpiry?.toISOString(),
        },
        customMetadata: obj.customMetadata,
      })),
      delimitedPrefixes: listed.delimitedPrefixes,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    };

    ctx.waitUntil(putCachedList(kvEnv, cacheKey, payload));

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Upload a single file
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const key = formData.get("key") as string | null;

    if (!file || !key) {
      return NextResponse.json(
        { error: "Missing file or key" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const putResult = await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    if (putResult) {
      ctx.waitUntil(indexOnWrite(env as unknown as IndexEnv, bucketName, key, putResult));
      ctx.waitUntil(
        recordActivity(env as unknown as AuditEnv, request, {
          action: "upload",
          bucket: bucketName,
          objectKey: key,
          metadata: {
            size: file.size,
            contentType: file.type || "application/octet-stream",
          },
        }),
      );
      await invalidateListCache(env as unknown as KvEnv, bucketName);
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
