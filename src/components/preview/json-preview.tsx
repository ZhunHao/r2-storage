"use client";

import { Highlight, themes } from "prism-react-renderer";
import { useMemo } from "react";
import { usePreviewText } from "@/components/preview/use-preview-text";

interface JsonPreviewProps {
  bucket: string;
  fileKey: string;
}

export function JsonPreview({ bucket, fileKey }: JsonPreviewProps) {
  const { data, isLoading, error } = usePreviewText(bucket, fileKey);

  const formatted = useMemo(() => {
    if (!data) return null;
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data; // Fall back to raw text if it isn't valid JSON
    }
  }, [data]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!formatted) return null;

  return (
    <Highlight code={formatted} language="json" theme={themes.vsDark}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${className} h-full overflow-auto rounded-sm p-4 text-xs`} style={style}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, tIdx) => (
                <span key={tIdx} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
