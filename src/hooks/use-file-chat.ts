"use client";

import type { ChatEvent, ChatMessage, ContextRef } from "@/types";
import { useCallback, useRef, useState } from "react";

interface UseFileChatResult {
  messages: ChatMessage[];
  status: "idle" | "streaming" | "error";
  error: string | null;
  context: ContextRef[];
  send: (text: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useFileChat(bucket: string, key: string): UseFileChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<UseFileChatResult["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ContextRef[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStatus("idle");
    setError(null);
    setContext([]);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "streaming") return;

      const next: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
        { role: "assistant", content: "" },
      ];
      setMessages(next);
      setStatus("streaming");
      setError(null);
      setContext([]);

      const controller = new AbortController();
      abortRef.current = controller;

      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      try {
        const res = await fetch(`/api/chat/${bucket}/${encodedKey}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: next.slice(0, -1), // omit the empty placeholder
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => null);
          throw new Error(
            (errBody as { error?: { message?: string } } | null)?.error?.message ??
              `${res.status}`
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistant = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            try {
              const event = JSON.parse(payload) as ChatEvent;
              if (event.type === "delta") {
                assistant += event.content;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistant };
                  return copy;
                });
              } else if (event.type === "context") {
                setContext(event.chunks);
              } else if (event.type === "error") {
                throw new Error(event.message);
              } else if (event.type === "done") {
                setStatus("idle");
                return;
              }
            } catch (err) {
              if (err instanceof Error && err.message) throw err;
            }
          }
        }
        setStatus("idle");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Chat failed";
        setError(msg);
        setStatus("error");
      } finally {
        abortRef.current = null;
      }
    },
    [bucket, key, messages, status]
  );

  return { messages, status, error, context, send, abort, reset };
}
