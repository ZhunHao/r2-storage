"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useFileChat } from "@/hooks/use-file-chat";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  bucket: string;
  fileKey: string;
}

export function ChatPanel({ bucket, fileKey }: ChatPanelProps) {
  const { messages, status, error, send, abort, reset } = useFileChat(bucket, fileKey);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset chat whenever the file changes.
  useEffect(() => {
    reset();
  }, [bucket, fileKey, reset]);

  // Auto-scroll on new content.
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input;
    setInput("");
    await send(text);
  };

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Chat with file</span>
        {status === "streaming" ? (
          <Button variant="ghost" size="sm" onClick={abort}>
            Stop
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={messages.length === 0}
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            Ask a question about this file.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "self-start rounded-lg bg-muted px-3 py-2 text-sm"
                }
              >
                {m.content ||
                  (status === "streaming" && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
            {/* Sentinel div for auto-scroll */}
            <div ref={bottomRef} />
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Ask a question…"
          rows={2}
          className="resize-none text-sm"
          disabled={status === "streaming"}
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={status === "streaming" || input.trim().length === 0}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
