import { describe, it, expect } from "vitest";
import {
  chunkText,
  cosineSim,
  isChatSupported,
  buildSmallFilePrompt,
  buildRagPrompt,
} from "@/lib/chat-prompt";

describe("isChatSupported", () => {
  it("accepts text/markdown", () => {
    expect(isChatSupported("text/markdown")).toBe(true);
    expect(isChatSupported("text/plain")).toBe(true);
    expect(isChatSupported("text/csv")).toBe(true);
    expect(isChatSupported("application/json")).toBe(true);
    expect(isChatSupported("application/xml")).toBe(true);
  });
  it("rejects binary", () => {
    expect(isChatSupported("application/pdf")).toBe(false);
    expect(isChatSupported("image/png")).toBe(false);
    expect(isChatSupported("application/octet-stream")).toBe(false);
  });
});

describe("chunkText", () => {
  it("returns single chunk for short text", () => {
    const chunks = chunkText("hello world", 100, 10);
    expect(chunks).toEqual([{ offset: 0, length: 11, text: "hello world" }]);
  });
  it("respects maxChars", () => {
    const text = "a".repeat(1000);
    const chunks = chunkText(text, 200, 50);
    expect(chunks.every((c) => c.text.length <= 200)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });
  it("overlaps successive chunks by `overlap` chars", () => {
    const text = "abcdefghij".repeat(10); // 100 chars
    const chunks = chunkText(text, 30, 10);
    // Chunk 0 ends at offset 30; chunk 1 starts at 20.
    expect(chunks[1].offset).toBe(20);
  });
});

describe("cosineSim", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSim([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });
  it("returns 0 for orthogonal", () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("handles zero vector defensively", () => {
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });
});

describe("buildSmallFilePrompt", () => {
  it("includes file metadata and content", () => {
    const out = buildSmallFilePrompt(
      { name: "x.md", contentType: "text/markdown", size: 5, modified: "2026-01-01" },
      "hello",
      [{ role: "user", content: "what?" }]
    );
    expect(out.system).toContain("x.md");
    expect(out.system).toContain("hello");
    expect(out.messages[0].content).toBe("what?");
  });
});

describe("buildRagPrompt", () => {
  it("includes context excerpts in system prompt", () => {
    const out = buildRagPrompt(
      { name: "x.md", contentType: "text/markdown", size: 5, modified: "2026-01-01" },
      [{ offset: 0, length: 5, text: "hello" }, { offset: 100, length: 5, text: "world" }],
      [{ role: "user", content: "what?" }]
    );
    expect(out.system).toContain("offset 0");
    expect(out.system).toContain("hello");
    expect(out.system).toContain("offset 100");
    expect(out.system).toContain("world");
  });
});
