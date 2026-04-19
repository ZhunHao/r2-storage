import { describe, it, expect } from "vitest";
import { mergeResults, type RankerSubstring, type RankerSemantic } from "@/lib/hybrid-ranker";

describe("mergeResults", () => {
  const semantic: RankerSemantic[] = [
    { key: "Finance/Q3.pdf", score: 0.85 },
    { key: "Finance/budget.xlsx", score: 0.72 },
  ];

  it("substring match alone scores 1.0", () => {
    const subs: RankerSubstring[] = [{ key: "readme.md", name: "readme.md" }];
    const out = mergeResults(subs, [], "rea");
    expect(out[0].key).toBe("readme.md");
    expect(out[0].score).toBeCloseTo(1.0);
  });

  it("exact filename match scores 3.0 (1.0 substring + 2.0 exact)", () => {
    const subs: RankerSubstring[] = [{ key: "readme.md", name: "readme.md" }];
    const out = mergeResults(subs, [], "readme.md");
    expect(out[0].score).toBeCloseTo(3.0);
  });

  it("dedupes by key, accumulating scores", () => {
    const subs: RankerSubstring[] = [{ key: "Finance/Q3.pdf", name: "Q3.pdf" }];
    const out = mergeResults(subs, semantic, "Q3");
    expect(out.find((r) => r.key === "Finance/Q3.pdf")?.score).toBeCloseTo(1.85);
    expect(out.length).toBe(2); // Q3 + budget.xlsx (semantic-only)
  });

  it("ranks by score descending", () => {
    const subs: RankerSubstring[] = [];
    const out = mergeResults(subs, semantic, "money");
    expect(out[0].key).toBe("Finance/Q3.pdf");
    expect(out[1].key).toBe("Finance/budget.xlsx");
  });

  it("limits to top 50", () => {
    const sem: RankerSemantic[] = Array.from({ length: 80 }, (_, i) => ({
      key: `f${i}.txt`,
      score: 0.5,
    }));
    expect(mergeResults([], sem, "x").length).toBe(50);
  });
});
