import { getBucket, getEnv, getEnvAndCtx } from "@/lib/r2";
import { invalidateListCache, type KvEnv } from "@/lib/listing-cache";
import { NextResponse } from "next/server";

// GET: Download an object
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> }
) {
  try {
    const { bucket: bucketName, key: keyParts } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    const key = keyParts.map(decodeURIComponent).join("/");

    const object = await bucket.get(key);
    if (!object) {
      return NextResponse.json(
        { error: "Object not found" },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ?? "application/octet-stream"
    );
    if (object.size) {
      headers.set("Content-Length", String(object.size));
    }
    headers.set("ETag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// HEAD: Get object metadata
export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> }
) {
  try {
    const { bucket: bucketName, key: keyParts } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    const key = keyParts.map(decodeURIComponent).join("/");

    const object = await bucket.head(key);
    if (!object) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ?? "application/octet-stream"
    );
    headers.set("Content-Length", String(object.size));
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());

    return new Response(null, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Update object metadata
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> }
) {
  try {
    const { bucket: bucketName, key: keyParts } = await params;
    const { env, ctx } = await getEnvAndCtx();
    const bucket = getBucket(env, bucketName);

    const key = keyParts.map(decodeURIComponent).join("/");

    const body = (await request.json()) as {
      httpMetadata?: Record<string, string>;
      customMetadata?: Record<string, string>;
    };

    const object = await bucket.get(key);
    if (!object) {
      return NextResponse.json(
        { error: "Object not found" },
        { status: 404 }
      );
    }

    // Re-put with updated metadata (R2 doesn't support metadata-only updates)
    await bucket.put(key, await object.arrayBuffer(), {
      httpMetadata: body.httpMetadata
        ? { ...object.httpMetadata, ...body.httpMetadata }
        : object.httpMetadata,
      customMetadata: body.customMetadata
        ? { ...object.customMetadata, ...body.customMetadata }
        : object.customMetadata,
    });

    await invalidateListCache(env as unknown as KvEnv, bucketName);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
