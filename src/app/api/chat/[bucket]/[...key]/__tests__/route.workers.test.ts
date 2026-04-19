import { describe, it, expect, vi, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { POST } from "@/app/api/chat/[bucket]/[...key]/route";

async function call(bucket: string, keyParts: string[], body: unknown) {
  const params = Promise.resolve({ bucket, key: keyParts });
  const req = new Request("https://x/api/chat/...", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params });
}

async function readSseFrames(res: Response): Promise<unknown[]> {
  if (!res.body) throw new Error("no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const out: unknown[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const f of frames) {
      const line = f.trim();
      if (line.startsWith("data:")) out.push(JSON.parse(line.slice(5).trim()));
    }
  }
  return out;
}

beforeEach(() => {
  // Mock Workers AI to stream three deterministic deltas in the SAME format
  // the real binding emits (verified via Task 19.5 probe).
  (env as unknown as { AI: { run: ReturnType<typeof vi.fn> } }).AI = {
    run: vi.fn(async (model: string) => {
      if (model.includes("bge-small")) {
        return { data: [Array.from({ length: 384 }, () => 0.1)] };
      }
      // Chat model — return a ReadableStream of SSE-formatted bytes.
      const lines = [
        `data: {"response":"Hello","p":"x"}\n\n`,
        `data: {"response":" world","p":"x"}\n\n`,
        `data: {"response":"!","p":"x"}\n\n`,
        `data: {"response":null,"usage":{"prompt_tokens":1}}\n\n`,
        `data: [DONE]\n\n`,
      ];
      return new ReadableStream({
        start(c) {
          for (const line of lines) c.enqueue(new TextEncoder().encode(line));
          c.close();
        },
      });
    }),
  };
});

describe("POST /api/chat/[bucket]/[...key]", () => {
  it("400 INVALID_REQUEST on missing messages", async () => {
    const res = await call("EXPLORER_TEST", ["chat-test", "readme.md"], {});
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("404 NOT_FOUND for unknown bucket", async () => {
    const res = await call("NOPE", ["chat-test", "readme.md"], {
      messages: [{ role: "user", content: "hi" }],
    });
    expect(res.status).toBe(404);
  });

  it("404 NOT_FOUND for missing file", async () => {
    const res = await call("EXPLORER_TEST", ["does-not-exist.md"], {
      messages: [{ role: "user", content: "hi" }],
    });
    expect(res.status).toBe(404);
  });

  it("415 UNSUPPORTED_TYPE for binary files", async () => {
    await env.EXPLORER_TEST.put("chat-test/photo.png", new Uint8Array([0x89, 0x50]), {
      httpMetadata: { contentType: "image/png" },
    });
    try {
      const res = await call("EXPLORER_TEST", ["chat-test", "photo.png"], {
        messages: [{ role: "user", content: "describe" }],
      });
      expect(res.status).toBe(415);
      expect((await res.json()).error.code).toBe("UNSUPPORTED_TYPE");
    } finally {
      await env.EXPLORER_TEST.delete("chat-test/photo.png").catch(() => {});
    }
  });

  it("happy path streams delta + done frames", async () => {
    await env.EXPLORER_TEST.put(
      "chat-test/readme.md",
      "Hello world content for chat test",
      { httpMetadata: { contentType: "text/markdown" } }
    );
    try {
      const res = await call("EXPLORER_TEST", ["chat-test", "readme.md"], {
        messages: [{ role: "user", content: "What is this?" }],
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const frames = (await readSseFrames(res)) as { type: string; content?: string }[];
      const deltas = frames.filter((f) => f.type === "delta").map((f) => f.content).join("");
      expect(deltas).toBe("Hello world!");
      expect(frames.at(-1)?.type).toBe("done");
    } finally {
      await env.EXPLORER_TEST.delete("chat-test/readme.md").catch(() => {});
    }
  });
});
