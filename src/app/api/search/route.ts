import { embed, type AiEnv } from "@/lib/ai";
import { discoverBuckets, getEnv } from "@/lib/r2";
import { query, type FileVectorMetadata, type VectorEnv } from "@/lib/vectorize";
import { NextResponse } from "next/server";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_QUERY_LEN = 200;
// Drop weak semantic matches. Empirically bge-small-en-v1.5 produces a
// uniform noise floor of ~0.55 for unrelated English text in this corpus
// (the shared `v1:` prefix on document+query inputs inflates the baseline).
// Genuine matches rise to 0.7+ (e.g. "food order" vs Food_Order_Tracker.md
// = 0.72). 0.6 cleanly separates signal from noise. Tune via this constant.
//
// TODO(phase-2.5a): Re-tune this threshold after content-based embedding
// ships. Score distribution will differ from filename-only embedding —
// content hits should score much higher, and the baseline may shift
// depending on whether the `v1:` prefix is retained. See
// docs/FEATURES-ROADMAP.md Feature 2.5a.
const MIN_SEMANTIC_SCORE = 0.6;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bucketName = url.searchParams.get("bucket")?.trim();
    const q = url.searchParams.get("q")?.trim();
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitRaw ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    if (!q || q.length === 0) {
      return NextResponse.json(
        { error: "Missing query parameter 'q'", code: "INVALID_QUERY" },
        { status: 400 }
      );
    }
    if (q.length > MAX_QUERY_LEN) {
      return NextResponse.json(
        { error: `Query too long (max ${MAX_QUERY_LEN})`, code: "INVALID_QUERY" },
        { status: 400 }
      );
    }
    if (!bucketName) {
      return NextResponse.json(
        { error: "Missing bucket parameter", code: "INVALID_QUERY" },
        { status: 400 }
      );
    }

    const env = await getEnv();
    const buckets = discoverBuckets(env);
    if (!buckets.includes(bucketName)) {
      return NextResponse.json(
        { error: `Unknown bucket "${bucketName}"`, code: "BUCKET_NOT_FOUND" },
        { status: 404 }
      );
    }

    let values: number[];
    try {
      values = await embed(env as unknown as AiEnv, `v1:${q.toLowerCase()}`);
    } catch (err) {
      console.error("[search] embed failed", err);
      return NextResponse.json(
        { error: "Embedding failed", code: "AI_UPSTREAM" },
        { status: 502 }
      );
    }

    let matches: { id: string; score: number; metadata: FileVectorMetadata }[];
    try {
      matches = await query(env as unknown as VectorEnv, values, {
        topK: limit,
        bucket: bucketName,
      });
    } catch (err) {
      console.error("[search] vectorize query failed", err);
      return NextResponse.json(
        { error: "Vector search failed", code: "VECTOR_UPSTREAM" },
        { status: 502 }
      );
    }

    const relevant = matches.filter((m) => m.score >= MIN_SEMANTIC_SCORE);

    return NextResponse.json({
      success: true,
      results: relevant.map((m) => ({
        key: m.metadata.key,
        name: m.metadata.name,
        folderPath: m.metadata.folderPath,
        size: m.metadata.size,
        contentType: m.metadata.contentType,
        modified: m.metadata.modified,
        score: m.score,
      })),
      query: q,
      count: relevant.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
