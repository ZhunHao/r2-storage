/**
 * Shared analytics data loader.
 *
 * Both `GET /api/analytics` and the `/analytics` server page need the same
 * aggregation: daily counts + top files + recent events + bucket totals.
 * This module owns that work so the route and the page stay thin.
 *
 * Intentionally does not catch errors — callers decide how to handle failure
 * (the route returns a JSON error envelope; the page renders ErrorCard).
 */

import { computeBucketTotals } from "@/lib/bucket-sizes";
import {
  ANALYTICS_DAILY_DAYS,
  ANALYTICS_RECENT_LIMIT,
  ANALYTICS_TOP_FILES_LIMIT,
  dailyQuery,
  recentQuery,
  topFilesQuery,
} from "@/lib/analytics-queries";
import type { ActivityRow } from "@/types/activity";
import type { BucketTotal, DailyPoint, TopFile } from "@/types/analytics";

export interface AnalyticsData {
  totalsByBucket: BucketTotal[];
  topFiles: TopFile[];
  daily: DailyPoint[];
  recent: ActivityRow[];
}

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function loadAnalyticsData(
  env: Record<string, unknown>,
): Promise<AnalyticsData> {
  const db = env.DB as D1Database;

  const d = dailyQuery(ANALYTICS_DAILY_DAYS);
  const t = topFilesQuery(ANALYTICS_TOP_FILES_LIMIT);
  const r = recentQuery(ANALYTICS_RECENT_LIMIT);

  const [daily, topFiles, recent, totalsByBucket] = await Promise.all([
    db
      .prepare(d.sql)
      .bind(...d.params)
      .all<{ day: string; action: string; n: number }>(),
    db
      .prepare(t.sql)
      .bind(...t.params)
      .all<{
        bucket: string;
        object_key: string;
        n: number;
        last_ts: string;
      }>(),
    db
      .prepare(r.sql)
      .bind(...r.params)
      .all<{
        id: number;
        ts: string;
        user_email: string | null;
        action: string;
        bucket: string;
        object_key: string | null;
        metadata: string | null;
      }>(),
    computeBucketTotals(env),
  ]);

  return {
    totalsByBucket,
    daily: daily.results.map((x) => ({
      day: x.day,
      action: x.action,
      count: x.n,
    })),
    topFiles: topFiles.results.map((x) => ({
      bucket: x.bucket,
      objectKey: x.object_key,
      count: x.n,
      lastTs: x.last_ts,
    })),
    recent: recent.results.map((x) => ({
      id: x.id,
      ts: x.ts,
      userEmail: x.user_email,
      action: x.action as ActivityRow["action"],
      bucket: x.bucket,
      objectKey: x.object_key,
      metadata: parseMetadata(x.metadata),
    })),
  };
}
