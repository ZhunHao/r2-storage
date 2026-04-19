import { describe, expect, it } from "vitest";
import { dailyQuery, recentQuery, topFilesQuery } from "@/lib/analytics-queries";

describe("dailyQuery", () => {
  it("returns sql + single iso param", () => {
    const { sql, params } = dailyQuery(30);
    expect(sql).toMatch(/strftime\('%Y-%m-%d', ts\)/);
    expect(params).toHaveLength(1);
    expect(typeof params[0]).toBe("string");
  });

  it("groups by day and action, ordered ascending", () => {
    const { sql } = dailyQuery(7);
    expect(sql).toMatch(/GROUP BY day, action/);
    expect(sql).toMatch(/ORDER BY day ASC/);
  });

  it("computes lookback from now within tolerance", () => {
    const days = 30;
    const before = Date.now();
    const { params } = dailyQuery(days);
    const after = Date.now();
    const iso = params[0] as string;
    const ts = Date.parse(iso);
    expect(Number.isNaN(ts)).toBe(false);
    // Expected window: ts == now - days*86400_000 (sampled between before/after)
    const windowMs = days * 86400_000;
    expect(ts).toBeGreaterThanOrEqual(before - windowMs - 50);
    expect(ts).toBeLessThanOrEqual(after - windowMs + 50);
  });

  it("rejects non-positive or non-integer days", () => {
    expect(() => dailyQuery(0)).toThrow(RangeError);
    expect(() => dailyQuery(-1)).toThrow(RangeError);
    expect(() => dailyQuery(1.5)).toThrow(RangeError);
  });
});

describe("topFilesQuery", () => {
  it("binds ISO lower-bound + LIMIT params", () => {
    const { sql, params } = topFilesQuery(10);
    expect(sql).toMatch(/LIMIT \?/);
    expect(params).toHaveLength(2);
    expect(typeof params[0]).toBe("string");
    expect(params[1]).toBe(10);
    // First param parses as an ISO timestamp
    expect(Number.isNaN(Date.parse(params[0] as string))).toBe(false);
  });

  it("filters out null object_key and enforces ts lower bound", () => {
    const { sql } = topFilesQuery(5);
    expect(sql).toMatch(/WHERE object_key IS NOT NULL/);
    expect(sql).toMatch(/AND ts >= \?/);
    expect(sql).toMatch(/ORDER BY n DESC/);
  });

  it("computes the 30-day default lookback from now within tolerance", () => {
    const days = 30;
    const before = Date.now();
    const { params } = topFilesQuery(10);
    const after = Date.now();
    const iso = params[0] as string;
    const ts = Date.parse(iso);
    const windowMs = days * 86400_000;
    expect(ts).toBeGreaterThanOrEqual(before - windowMs - 50);
    expect(ts).toBeLessThanOrEqual(after - windowMs + 50);
  });

  it("honors an explicit days override", () => {
    const days = 7;
    const before = Date.now();
    const { params } = topFilesQuery(5, days);
    const after = Date.now();
    const iso = params[0] as string;
    const ts = Date.parse(iso);
    const windowMs = days * 86400_000;
    expect(ts).toBeGreaterThanOrEqual(before - windowMs - 50);
    expect(ts).toBeLessThanOrEqual(after - windowMs + 50);
    expect(params[1]).toBe(5);
  });

  it("rejects non-positive or non-integer limit", () => {
    expect(() => topFilesQuery(0)).toThrow(RangeError);
    expect(() => topFilesQuery(-1)).toThrow(RangeError);
    expect(() => topFilesQuery(1.5)).toThrow(RangeError);
  });

  it("rejects non-positive or non-integer days", () => {
    expect(() => topFilesQuery(10, 0)).toThrow(RangeError);
    expect(() => topFilesQuery(10, -1)).toThrow(RangeError);
    expect(() => topFilesQuery(10, 1.5)).toThrow(RangeError);
  });
});

describe("recentQuery", () => {
  it("selects full activity columns with LIMIT param", () => {
    const { sql, params } = recentQuery(25);
    expect(sql).toMatch(/SELECT id, ts, user_email, action, bucket, object_key, metadata/);
    expect(sql).toMatch(/ORDER BY ts DESC, id DESC/);
    expect(sql).toMatch(/LIMIT \?/);
    expect(params).toEqual([25]);
  });

  it("rejects non-positive or non-integer limit", () => {
    expect(() => recentQuery(0)).toThrow(RangeError);
    expect(() => recentQuery(-1)).toThrow(RangeError);
    expect(() => recentQuery(1.5)).toThrow(RangeError);
  });
});
