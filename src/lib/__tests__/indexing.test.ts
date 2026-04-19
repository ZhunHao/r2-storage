import { describe, it, expect } from "vitest";
import { shouldSkip, buildEmbedInput } from "@/lib/indexing";

describe("shouldSkip", () => {
  it("skips folder markers", () => {
    expect(shouldSkip("a/b/")).toBe(true);
  });
  it("skips share metadata", () => {
    expect(shouldSkip(".r2-storage/shares/abc.json")).toBe(true);
  });
  it("does not skip normal files", () => {
    expect(shouldSkip("Finance/Q3.pdf")).toBe(false);
  });
});

describe("buildEmbedInput", () => {
  it("produces v1-prefixed lower-case input", () => {
    expect(buildEmbedInput("Finance/2026/Q3-Earnings.pdf", "application/pdf"))
      .toBe("v1:q3-earnings.pdf finance 2026 application/pdf");
  });
  it("handles root files", () => {
    expect(buildEmbedInput("readme.md", "text/markdown"))
      .toBe("v1:readme.md  text/markdown");
  });
  it("truncates to 256 chars", () => {
    const long = "a".repeat(300) + "/file.txt";
    expect(buildEmbedInput(long, "text/plain").length).toBeLessThanOrEqual(256);
  });
});
