"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePreviewText } from "@/components/preview/use-preview-text";

interface MarkdownPreviewProps {
  bucket: string;
  fileKey: string;
}

export function MarkdownPreview({ bucket, fileKey }: MarkdownPreviewProps) {
  const { data, isLoading, error } = usePreviewText(bucket, fileKey);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <article className="prose prose-sm max-w-none overflow-auto bg-background p-6 dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
    </article>
  );
}
