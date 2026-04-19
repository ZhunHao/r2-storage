// Pure SQL builders for the analytics dashboard.
// Each builder returns `{ sql, params }` — no D1/env coupling — so they can be
// unit-tested in the node pool and executed against D1 in API handlers via
// `db.prepare(sql).bind(...params)`.

export interface SqlBuild {
  sql: string;
  params: (string | number)[];
}

const MS_PER_DAY = 86_400_000;

// Default limits used by the analytics endpoint + page loader.
// Centralized here so the query builder and its callers stay in lock-step.
export const ANALYTICS_DAILY_DAYS = 30;
export const ANALYTICS_TOP_FILES_LIMIT = 10;
export const ANALYTICS_RECENT_LIMIT = 20;

/**
 * Daily activity aggregate for the last `days` days, grouped by (day, action).
 * Binds the ISO lower-bound timestamp for `ts >= ?`.
 */
export function dailyQuery(days: number): SqlBuild {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`dailyQuery: days must be a positive integer, received ${days}`);
  }
  const from = new Date(Date.now() - days * MS_PER_DAY).toISOString();
  return {
    sql: `SELECT strftime('%Y-%m-%d', ts) AS day, action, COUNT(*) AS n
            FROM activity
           WHERE ts >= ?
           GROUP BY day, action
           ORDER BY day ASC`,
    params: [from],
  };
}

/**
 * Top-N (bucket, object_key) pairs by activity count within the last `days` days.
 * Skips rows with null `object_key` (folder/bucket-level events).
 * Defaults `days` to `ANALYTICS_DAILY_DAYS` so callers stay simple and the
 * window matches the daily chart unless overridden.
 */
export function topFilesQuery(
  limit: number,
  days: number = ANALYTICS_DAILY_DAYS,
): SqlBuild {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`topFilesQuery: limit must be a positive integer, received ${limit}`);
  }
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`topFilesQuery: days must be a positive integer, received ${days}`);
  }
  const from = new Date(Date.now() - days * MS_PER_DAY).toISOString();
  return {
    sql: `SELECT bucket, object_key, COUNT(*) AS n, MAX(ts) AS last_ts
            FROM activity
           WHERE object_key IS NOT NULL
             AND ts >= ?
           GROUP BY bucket, object_key
           ORDER BY n DESC
           LIMIT ?`,
    params: [from, limit],
  };
}

/**
 * Most recent `limit` activity rows, newest first.
 * Ties on `ts` break by `id DESC` for deterministic ordering.
 */
export function recentQuery(limit: number): SqlBuild {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`recentQuery: limit must be a positive integer, received ${limit}`);
  }
  return {
    sql: `SELECT id, ts, user_email, action, bucket, object_key, metadata
            FROM activity
           ORDER BY ts DESC, id DESC
           LIMIT ?`,
    params: [limit],
  };
}
