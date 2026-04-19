import { describe, expect, it } from "vitest";
import { extractUserEmail, serializeMetadata } from "@/lib/audit";

describe("extractUserEmail", () => {
  it("returns the Cf-Access header value", () => {
    const req = new Request("http://x", {
      headers: { "Cf-Access-Authenticated-User-Email": "demo@example.com" },
    });
    expect(extractUserEmail(req)).toBe("demo@example.com");
  });

  it("returns null when the header is absent", () => {
    expect(extractUserEmail(new Request("http://x"))).toBeNull();
  });
});

describe("serializeMetadata", () => {
  it("returns null for undefined metadata", () => {
    expect(serializeMetadata(undefined)).toBeNull();
  });
  it("serializes object metadata to JSON", () => {
    expect(serializeMetadata({ size: 123 })).toBe('{"size":123}');
  });
});
