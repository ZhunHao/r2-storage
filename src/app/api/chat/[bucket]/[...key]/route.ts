import { chatStream, embed, type AiEnv } from "@/lib/ai";
import {
  buildRagPrompt,
  buildSmallFilePrompt,
  chunkText,
  cosineSim,
  isChatSupported,
} from "@/lib/chat-prompt";
import { discoverBuckets, getBucket, getEnv } from "@/lib/r2";
import { SSE_HEADERS, sseFrame } from "@/lib/sse";
import type { ChatEvent, ChatMessage, ContextRef } from "@/types";
import { NextResponse } from "next/server";

const MAX_FILE_BYTES = 2 * 1024 * 1024;          // 2 MB cap
const SMALL_FILE_THRESHOLD = 16 * 1024;          // ≤ 16 KB → stuff (≈ 4k tokens)
const CHUNK_CHARS = 3000;                        // ≈ 750 tokens
const CHUNK_OVERLAP = 300;                       // 10% overlap
const TOP_K = 5;
const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 4000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> }
) {
  const { bucket: bucketName, key: keyParts } = await params;
  const key = keyParts.map(decodeURIComponent).join("/");

  let body: { messages?: ChatMessage[] };
  try {
    body = (await request.json()) as { messages?: ChatMessage[] };
  } catch {
    return jsonError(400, "INVALID_REQUEST", "Invalid JSON");
  }
  const messages = body.messages ?? [];
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    messages.reduce((n, m) => n + (m.content?.length ?? 0), 0) > MAX_TOTAL_CHARS
  ) {
    return jsonError(400, "INVALID_REQUEST", "Invalid messages");
  }

  const env = await getEnv();
  if (!discoverBuckets(env).includes(bucketName)) {
    return jsonError(404, "NOT_FOUND", `Unknown bucket "${bucketName}"`);
  }
  const bucket = getBucket(env, bucketName);

  const obj = await bucket.get(key);
  if (!obj) {
    return jsonError(404, "NOT_FOUND", "File not found");
  }
  const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";
  if (!isChatSupported(contentType)) {
    return jsonError(415, "UNSUPPORTED_TYPE", `Cannot chat with ${contentType}`);
  }
  if (obj.size > MAX_FILE_BYTES) {
    return jsonError(413, "FILE_TOO_LARGE", `File exceeds ${MAX_FILE_BYTES} bytes`);
  }

  const fullText = await obj.text();
  const fileMeta = {
    name: key.split("/").pop() ?? key,
    contentType,
    size: obj.size,
    modified: obj.uploaded.toISOString(),
  };

  const last = messages.at(-1);
  if (!last || last.role !== "user") {
    return jsonError(400, "INVALID_REQUEST", "Last message must be from user");
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Run the LLM in the background; flush deltas as they arrive.
  (async () => {
    try {
      let prompt;
      let contextRefs: ContextRef[] = [];

      if (fullText.length <= SMALL_FILE_THRESHOLD) {
        prompt = buildSmallFilePrompt(fileMeta, fullText, messages);
      } else {
        const chunks = chunkText(fullText, CHUNK_CHARS, CHUNK_OVERLAP);
        const queryVec = await embed(env as unknown as AiEnv, last.content);
        const scored = await Promise.all(
          chunks.map(async (c) => ({
            chunk: c,
            score: cosineSim(queryVec, await embed(env as unknown as AiEnv, c.text)),
          }))
        );
        const top = scored.sort((a, b) => b.score - a.score).slice(0, TOP_K);
        const topChunks = top.map((t) => t.chunk);
        prompt = buildRagPrompt(fileMeta, topChunks, messages);
        contextRefs = topChunks.map((c) => ({
          offset: c.offset,
          length: c.length,
          preview: c.text.slice(0, 80),
        }));
        await writeEvent(writer, encoder, { type: "context", chunks: contextRefs });
      }

      const upstream = chatStream(env as unknown as AiEnv, [
        { role: "system", content: prompt.system },
        ...prompt.messages,
      ]);

      for await (const delta of upstream) {
        await writeEvent(writer, encoder, { type: "delta", content: delta });
      }

      await writeEvent(writer, encoder, { type: "done" });
    } catch (err) {
      console.error("[chat] stream failed", err);
      await writeEvent(writer, encoder, {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
        code: "AI_UPSTREAM",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, { headers: SSE_HEADERS });
}

async function writeEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  event: ChatEvent
): Promise<void> {
  await writer.write(encoder.encode(sseFrame(event)));
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}
