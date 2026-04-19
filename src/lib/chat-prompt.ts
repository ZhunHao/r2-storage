/**
 * Pure helpers for the chat-with-files feature: content-type allow list,
 * chunker, cosine similarity, and prompt construction (single-shot or RAG).
 *
 * Approximation: 1 token ≈ 4 chars (English). We enforce char limits, not
 * token limits, since llama-3 tokenizer is not available in-Worker without
 * shipping a 1 MB BPE table.
 */

const SUPPORTED_CONTENT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/xml",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
]);

export function isChatSupported(contentType: string | undefined | null): boolean {
  if (!contentType) return false;
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (SUPPORTED_CONTENT_TYPES.has(ct)) return true;
  if (ct.startsWith("text/")) return true;
  return false;
}

export interface Chunk {
  offset: number;
  length: number;
  text: string;
}

export function chunkText(text: string, maxChars: number, overlap: number): Chunk[] {
  if (text.length <= maxChars) {
    return [{ offset: 0, length: text.length, text }];
  }
  const out: Chunk[] = [];
  let cursor = 0;
  const stride = Math.max(1, maxChars - overlap);
  while (cursor < text.length) {
    const end = Math.min(cursor + maxChars, text.length);
    out.push({ offset: cursor, length: end - cursor, text: text.slice(cursor, end) });
    if (end >= text.length) break;
    cursor += stride;
  }
  return out;
}

export function cosineSim(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface FileMetaForPrompt {
  name: string;
  contentType: string;
  size: number;
  modified: string;
}

export interface ChatRoleMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface BuiltPrompt {
  system: string;
  messages: ChatRoleMessage[];
}

const SYSTEM_PREAMBLE = `You are a helpful assistant answering questions about a single file.
Answer ONLY from the file content provided below.
If the answer is not in the content, say "I can't find that in this file."
Be concise.`;

export function buildSmallFilePrompt(
  file: FileMetaForPrompt,
  fullText: string,
  userMessages: ChatRoleMessage[]
): BuiltPrompt {
  const system = [
    SYSTEM_PREAMBLE,
    `\nFile: ${file.name} (${file.contentType}, ${file.size} bytes, modified ${file.modified}).`,
    `\nFILE CONTENT:\n${fullText}`,
  ].join("");
  return { system, messages: userMessages };
}

export function buildRagPrompt(
  file: FileMetaForPrompt,
  chunks: Chunk[],
  userMessages: ChatRoleMessage[]
): BuiltPrompt {
  const excerpts = chunks
    .map((c) => `[offset ${c.offset}-${c.offset + c.length}]\n${c.text}`)
    .join("\n\n");
  const system = [
    SYSTEM_PREAMBLE,
    `\nFile: ${file.name} (${file.contentType}, ${file.size} bytes, modified ${file.modified}).`,
    `\nRELEVANT EXCERPTS:\n${excerpts}`,
  ].join("");
  return { system, messages: userMessages };
}
