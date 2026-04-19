/**
 * Serialise a typed event as an SSE frame.
 * Always followed by a blank line per the SSE spec.
 */
export function sseFrame(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};
