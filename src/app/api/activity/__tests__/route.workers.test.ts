import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach } from "vitest";
import { GET } from "@/app/api/activity/route";

async function seed() {
  const rows: Array<[string, string, string, string, string, string | null]> = [
    ["2026-04-17T00:00:00Z", "a@x", "upload", "b", "k1", null],
    ["2026-04-17T00:00:01Z", "a@x", "delete", "b", "k1", null],
    ["2026-04-17T00:00:02Z", "b@x", "upload", "b", "k2", null],
  ];
  for (const r of rows) {
    await env.DB.prepare(
      "INSERT INTO activity (ts, user_email, action, bucket, object_key, metadata) VALUES (?,?,?,?,?,?)",
    )
      .bind(...r)
      .run();
  }
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM activity").run();
});

describe("GET /api/activity", () => {
  it("paginates with limit + nextCursor", async () => {
    await seed();
    const res = await GET(new Request("http://x/api/activity?limit=2"));
    const body = (await res.json()) as {
      success: boolean;
      rows: unknown[];
      nextCursor: string | null;
    };
    expect(body.success).toBe(true);
    expect(body.rows).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("filters by bucket + action combination", async () => {
    await seed();
    const res = await GET(
      new Request("http://x/api/activity?bucket=b&action=upload&limit=10"),
    );
    const body = (await res.json()) as {
      success: boolean;
      rows: Array<{ action: string }>;
    };
    expect(body.success).toBe(true);
    expect(body.rows).toHaveLength(2);
    expect(body.rows.every((r) => r.action === "upload")).toBe(true);
  });

  it("returns 400 when cursor is malformed", async () => {
    const res = await GET(
      new Request("http://x/api/activity?cursor=bm9waXBl"),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid cursor");
  });
});
