import { describe, it, expect, vi, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { GET } from "@/app/api/search/route";

// Stub AI + Vectorize bindings on the test env so we don't hit real services.
beforeEach(() => {
  (env as unknown as { AI: { run: ReturnType<typeof vi.fn> } }).AI = {
    run: vi.fn(async () => ({ data: [Array.from({ length: 384 }, () => 0.1)] })),
  };
  (env as unknown as { VECTOR_INDEX: { query: ReturnType<typeof vi.fn> } }).VECTOR_INDEX = {
    query: vi.fn(async () => ({
      matches: [
        {
          id: "EXPLORER_TEST::readme.md",
          score: 0.91,
          metadata: {
            bucket: "EXPLORER_TEST",
            key: "readme.md",
            name: "readme.md",
            folderPath: "",
            size: 100,
            contentType: "text/markdown",
            modified: "2026-04-01T00:00:00.000Z",
            embedVersion: "v1",
          },
        },
        {
          id: "EXPLORER_TEST::noise.txt",
          score: 0.42, // below MIN_SEMANTIC_SCORE — should be filtered
          metadata: {
            bucket: "EXPLORER_TEST",
            key: "noise.txt",
            name: "noise.txt",
            folderPath: "",
            size: 5,
            contentType: "text/plain",
            modified: "2026-04-01T00:00:00.000Z",
            embedVersion: "v1",
          },
        },
      ],
    })),
  };
});

describe("GET /api/search", () => {
  it("400 when q is missing", async () => {
    const res = await GET(new Request("https://x/api/search?bucket=EXPLORER_TEST"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_QUERY" });
  });

  it("400 when q is too long", async () => {
    const long = "x".repeat(201);
    const res = await GET(new Request(`https://x/api/search?bucket=EXPLORER_TEST&q=${long}`));
    expect(res.status).toBe(400);
  });

  it("400 when bucket is missing", async () => {
    const res = await GET(new Request("https://x/api/search?q=foo"));
    expect(res.status).toBe(400);
  });

  it("404 for unknown bucket", async () => {
    const res = await GET(new Request("https://x/api/search?bucket=NOPE&q=foo"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "BUCKET_NOT_FOUND" });
  });

  it("happy path returns only above-threshold results", async () => {
    const res = await GET(new Request("https://x/api/search?bucket=EXPLORER_TEST&q=readme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      query: "readme",
      count: 1, // the 0.42 match is dropped by MIN_SEMANTIC_SCORE
      results: [{ key: "readme.md", score: 0.91 }],
    });
    expect(
      body.results.find((r: { key: string }) => r.key === "noise.txt")
    ).toBeUndefined();
  });

  it("returns zero results when all matches are below threshold", async () => {
    (
      env as unknown as { VECTOR_INDEX: { query: ReturnType<typeof vi.fn> } }
    ).VECTOR_INDEX.query.mockResolvedValueOnce({
      matches: [
        {
          id: "EXPLORER_TEST::a.txt",
          score: 0.3,
          metadata: {
            bucket: "EXPLORER_TEST",
            key: "a.txt",
            name: "a.txt",
            folderPath: "",
            size: 1,
            contentType: "text/plain",
            modified: "2026-04-01T00:00:00.000Z",
            embedVersion: "v1",
          },
        },
        {
          id: "EXPLORER_TEST::b.txt",
          score: 0.45,
          metadata: {
            bucket: "EXPLORER_TEST",
            key: "b.txt",
            name: "b.txt",
            folderPath: "",
            size: 1,
            contentType: "text/plain",
            modified: "2026-04-01T00:00:00.000Z",
            embedVersion: "v1",
          },
        },
      ],
    });
    const res = await GET(
      new Request("https://x/api/search?bucket=EXPLORER_TEST&q=nothing+matches")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      count: 0,
      results: [],
    });
  });

  it("502 when AI binding fails", async () => {
    (env as unknown as { AI: { run: ReturnType<typeof vi.fn> } }).AI.run.mockRejectedValueOnce(
      new Error("upstream")
    );
    const res = await GET(new Request("https://x/api/search?bucket=EXPLORER_TEST&q=foo"));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "AI_UPSTREAM" });
  });
});
