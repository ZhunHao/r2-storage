import { indexOnWrite, type IndexEnv } from "@/lib/indexing";
import { getBucket, getEnv } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket: bucketName } = await params;
    const env = await getEnv();
    const bucket = getBucket(env, bucketName);

    let cursor: string | undefined;
    let total = 0;
    let indexed = 0;

    do {
      const listed = await bucket.list({ cursor, limit: 100 });
      for (const obj of listed.objects) {
        total++;
        if (obj.key.endsWith("/") || obj.key.startsWith(".r2-storage/")) continue;
        // bucket.list returns R2Object; indexOnWrite needs size/uploaded/httpMetadata — all present.
        await indexOnWrite(env as unknown as IndexEnv, bucketName, obj.key, obj);
        indexed++;
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    return NextResponse.json({ success: true, total, indexed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
