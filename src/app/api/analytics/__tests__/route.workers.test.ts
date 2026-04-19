import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/analytics/route";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM activity").run();
  const now = new Date().toISOString();
  for (let i = 0; i < 5; i++) {
    await env.DB.prepare(
      "INSERT INTO activity (ts, user_email, action, bucket, object_key, metadata) VALUES (?,?,?,?,?,?)",
    )
      .bind(now, "a@x", "upload", "b", "k" + (i % 2), null)
      .run();
  }
});

describe("GET /api/analytics", () => {
  it("returns daily, topFiles, recent aggregates", async () => {
    const res = await GET(new Request("http://x/api/analytics"));
    const body = (await res.json()) as {
      success: boolean;
      daily: Array<{ day: string; action: string; count: number }>;
      topFiles: Array<{ count: number }>;
      recent: Array<{ action: string; userEmail: string | null }>;
      totalsByBucket: unknown;
    };
    expect(body.success).toBe(true);
    expect(body.daily.length).toBeGreaterThan(0);
    expect(body.topFiles[0].count).toBe(3);
    expect(body.recent).toHaveLength(5);
    expect(body.recent[0].action).toBe("upload");
    expect(body.recent[0].userEmail).toBe("a@x");
    expect(Array.isArray(body.totalsByBucket)).toBe(true);
  });
});
