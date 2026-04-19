import { describe, expect, it, vi } from "vitest";
import { computeBucketTotals } from "@/lib/bucket-sizes";

type ListPage = {
  objects: { size: number }[];
  truncated: boolean;
  cursor?: string;
};

function makeBucket(pages: ListPage[]) {
  const list = vi.fn(async () => {
    const next = pages.shift();
    if (!next) throw new Error("list called more times than pages provided");
    return next;
  });
  return {
    list,
    get: () => undefined,
    put: () => undefined,
    delete: () => undefined,
    head: () => undefined,
    createMultipartUpload: () => undefined,
  };
}

describe("computeBucketTotals", () => {
  it("sums object count and bytes across paginated list results", async () => {
    const bucket = makeBucket([
      {
        objects: [{ size: 100 }, { size: 200 }],
        truncated: true,
        cursor: "c1",
      },
      { objects: [{ size: 50 }], truncated: false },
    ]);
    const env = { SUMBUCKET: bucket };

    const totals = await computeBucketTotals(env);

    expect(totals).toEqual([{ bucket: "SUMBUCKET", objects: 3, bytes: 350 }]);
    expect(bucket.list).toHaveBeenCalledTimes(2);
  });

  it("returns zero-sentinel and logs when bucket.list rejects", async () => {
    const bucket = {
      list: vi.fn(async () => {
        throw new Error("boom");
      }),
      get: () => undefined,
      put: () => undefined,
      delete: () => undefined,
      head: () => undefined,
      createMultipartUpload: () => undefined,
    };
    const env = { ERRBUCKET: bucket };
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const totals = await computeBucketTotals(env);

      expect(totals).toEqual([{ bucket: "ERRBUCKET", objects: 0, bytes: 0 }]);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it("memoizes bucket totals for 60 seconds across calls", async () => {
    const bucket = makeBucket([
      {
        objects: [{ size: 100 }, { size: 200 }],
        truncated: true,
        cursor: "c1",
      },
      { objects: [{ size: 50 }], truncated: false },
    ]);
    const env = { CACHEBUCKET: bucket };

    const first = await computeBucketTotals(env);
    const second = await computeBucketTotals(env);

    expect(first).toEqual([{ bucket: "CACHEBUCKET", objects: 3, bytes: 350 }]);
    expect(second).toEqual(first);
    expect(bucket.list).toHaveBeenCalledTimes(2); // only the first scan
  });
});
