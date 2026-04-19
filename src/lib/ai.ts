/**
 * AI client wrapper. All Workers AI calls in the app MUST go through this
 * module so they pass through AI Gateway (observability, caching, rate limit).
 *
 * We use the AI binding's `gateway` option rather than raw fetch — the platform
 * pre-authenticates the request based on the Worker's account, so no
 * `cf-aig-authorization` header / token management is needed.
 * See: https://developers.cloudflare.com/ai-gateway/configuration/authentication/
 *
 * Models:
 *   - embed: @cf/baai/bge-small-en-v1.5     (384-dim, English-biased, free tier)
 *   - chat:  @cf/meta/llama-3.1-8b-instruct-fp8  (fp8 quantized, free tier; the
 *           bare `@cf/meta/llama-3.1-8b-instruct` works at runtime but isn't
 *           in `keyof AiModels` in current @cloudflare/workers-types)
 */

const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";

export interface AiEnv {
  AI: Ai;
  AI_GATEWAY_NAME?: string; // optional — falls back to no-gateway routing if unset
}

interface EmbedResponse {
  data: number[][];
}

/**
 * Embed a single string. Returns a 384-dim vector.
 * Routes through AI Gateway when AI_GATEWAY_NAME is set; otherwise the call
 * goes direct to Workers AI (no caching/observability).
 */
export async function embed(env: AiEnv, text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, 512);
  if (!trimmed) {
    throw new Error("embed: empty text");
  }

  const options = env.AI_GATEWAY_NAME
    ? { gateway: { id: env.AI_GATEWAY_NAME } }
    : undefined;

  const result = (await env.AI.run(
    EMBED_MODEL,
    { text: [trimmed] },
    options
  )) as EmbedResponse;

  const vec = result.data?.[0];
  if (!vec || vec.length !== 384) {
    throw new Error(
      `embed: unexpected response shape (len=${vec?.length ?? "undefined"})`
    );
  }
  return vec;
}

const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const DEFAULT_MAX_TOKENS = 1024;

export interface ChatStreamMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Stream chat completion as an async iterable of token deltas.
 * Routes through AI Gateway when AI_GATEWAY_NAME is set.
 *
 * Stream format (verified via probe):
 *   data: {"response": "<token>", "p": "<opaque>"}\n\n
 *   ...
 *   data: {"response": null, "usage": {...}}\n\n   (skipped)
 *   data: {"response": "", "usage": {...}}\n\n     (skipped)
 *   data: [DONE]\n\n
 */
export async function* chatStream(
  env: AiEnv,
  messages: ChatStreamMessage[]
): AsyncIterable<string> {
  const options = env.AI_GATEWAY_NAME
    ? { gateway: { id: env.AI_GATEWAY_NAME } }
    : undefined;

  const stream = (await env.AI.run(
    CHAT_MODEL,
    {
      messages,
      stream: true,
      max_tokens: DEFAULT_MAX_TOKENS,
    },
    options
  )) as ReadableStream<Uint8Array>;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: chunks separated by blank lines (\n\n).
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as { response?: string | null };
        if (typeof json.response === "string" && json.response !== "") {
          yield json.response;
        }
      } catch {
        // Skip non-JSON keepalive frames.
      }
    }
  }
}
