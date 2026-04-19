import { discoverBuckets, getEnv } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const env = await getEnv();
    const bucketNames = discoverBuckets(env);
    const buckets = bucketNames.map((name) => ({ name }));

    return NextResponse.json({
      buckets,
      readonly: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
