"use client";

import { useMemo } from "react";
import { usePreviewText } from "@/components/preview/use-preview-text";

interface HtmlPreviewProps {
  bucket: string;
  fileKey: string;
}

export function HtmlPreview({ bucket, fileKey }: HtmlPreviewProps) {
  const { data, isLoading, error } = usePreviewText(bucket, fileKey);

  const srcDoc = useMemo(() => data ?? "", [data]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  // sandbox="" disables scripts, forms, same-origin, plugins, and top navigation.
  // srcDoc prevents the iframe from making cross-origin requests to our API.
  return (
    <iframe
      title="HTML preview"
      srcDoc={srcDoc}
      sandbox=""
      className="h-full w-full rounded-sm border bg-white"
    />
  );
}
