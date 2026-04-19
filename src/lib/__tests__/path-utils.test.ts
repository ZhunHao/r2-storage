import { describe, it, expect } from "vitest";
import { basename, dirname } from "@/lib/path-utils";

describe("basename", () => {
  it("returns last segment", () => {
    expect(basename("a/b/c.txt")).toBe("c.txt");
  });
  it("returns key itself when no slash", () => {
    expect(basename("c.txt")).toBe("c.txt");
  });
  it("ignores trailing slash", () => {
    expect(basename("a/b/")).toBe("b");
  });
  it("returns empty string for empty input", () => {
    expect(basename("")).toBe("");
  });
});

describe("dirname", () => {
  it("returns parent with trailing slash", () => {
    expect(dirname("a/b/c.txt")).toBe("a/b/");
  });
  it("returns empty for root file", () => {
    expect(dirname("c.txt")).toBe("");
  });
  it("handles trailing slash", () => {
    expect(dirname("a/b/")).toBe("a/");
  });
});
