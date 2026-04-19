import { describe, it, expect } from "vitest";
import { vectorId, parseVectorId } from "@/lib/vectorize";

describe("vectorId", () => {
  it("joins bucket and key with ::", () => {
    expect(vectorId("EXPLORER_TEST", "Finance/Q3.pdf")).toBe(
      "EXPLORER_TEST::Finance/Q3.pdf"
    );
  });
  it("preserves nested keys", () => {
    expect(vectorId("B", "a/b/c.txt")).toBe("B::a/b/c.txt");
  });
});

describe("parseVectorId", () => {
  it("round-trips", () => {
    const id = vectorId("EXPLORER_TEST", "Finance/Q3.pdf");
    expect(parseVectorId(id)).toEqual({
      bucket: "EXPLORER_TEST",
      key: "Finance/Q3.pdf",
    });
  });
  it("returns null on malformed input", () => {
    expect(parseVectorId("nope")).toBeNull();
  });
});
