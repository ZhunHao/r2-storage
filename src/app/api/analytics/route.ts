import { NextResponse } from "next/server";
import { getEnv } from "@/lib/r2";
import { loadAnalyticsData } from "@/lib/analytics-data";
import type { AnalyticsResponse } from "@/types/analytics";

export async function GET(_req: Request): Promise<Response> {
  const env = await getEnv();

  try {
    const data = await loadAnalyticsData(env);
    const response: AnalyticsResponse = { success: true, ...data };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[analytics] query failed", err);
    return NextResponse.json(
      { success: false, error: "analytics unavailable" },
      { status: 500 },
    );
  }
}
