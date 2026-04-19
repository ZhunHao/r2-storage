"use client";

import { Highlight, themes } from "prism-react-renderer";
import { usePreviewText } from "@/components/preview/use-preview-text";
import { getExtension } from "@/lib/file-utils";

interface CodePreviewProps {
  bucket: string;
  fileKey: string;
}

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  py: "python", rs: "rust", go: "go", sh: "bash", toml: "toml",
  yaml: "yaml", yml: "yaml", xml: "markup", html: "markup",
  css: "css", json: "json", md: "markdown",
};

export function CodePreview({ bucket, fileKey }: CodePreviewProps) {
  const { data, isLoading, error } = usePreviewText(bucket, fileKey);
  const lang = EXT_TO_LANG[getExtension(fileKey)] ?? "text";

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <Highlight code={data} language={lang} theme={themes.vsDark}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} h-full overflow-auto rounded-sm p-4 text-xs`}
          style={style}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground">
                {i + 1}
              </span>
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
