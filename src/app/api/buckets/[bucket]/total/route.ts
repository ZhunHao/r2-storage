import { totalForBucket } from "@/lib/bucket-sizes";
import { getEnv } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket } = await params;
    const env = await getEnv();
    const total = await totalForBucket(env, bucket);
    return NextResponse.json(total);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
