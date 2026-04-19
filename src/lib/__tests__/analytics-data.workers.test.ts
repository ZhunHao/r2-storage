import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { loadAnalyticsData } from "@/lib/analytics-data";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM activity").run();
  const now = new Date().toISOString();
  for (let i = 0; i < 3; i++) {
    await env.DB.prepare(
      "INSERT INTO activity (ts, user_email, action, bucket, object_key, metadata) VALUES (?,?,?,?,?,?)",
    )
      .bind(now, "a@x", "upload", "b", "k" + i, null)
      .run();
  }
});

describe("loadAnalyticsData", () => {
  it("returns typed aggregate shapes for seeded activity", async () => {
    const data = await loadAnalyticsData(env as unknown as Record<string, unknown>);

    expect(data.recent).toHaveLength(3);
    expect(data.daily.length).toBeGreaterThan(0);
    expect(Array.isArray(data.totalsByBucket)).toBe(true);
    expect(Array.isArray(data.topFiles)).toBe(true);
  });
});
