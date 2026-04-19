"use client";

import { useQuery } from "@tanstack/react-query";
import pako from "pako";
import { fetchObjectArrayBuffer } from "@/lib/api-client";

interface GzipLogPreviewProps {
  bucket: string;
  fileKey: string;
}

export function GzipLogPreview({ bucket, fileKey }: GzipLogPreviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["preview-gzip", bucket, fileKey],
    queryFn: async () => {
      const buffer = await fetchObjectArrayBuffer(bucket, fileKey);
      return pako.ungzip(new Uint8Array(buffer), { to: "string" });
    },
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Decompressing…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <pre className="h-full overflow-auto rounded-sm bg-background p-4 text-xs leading-5">
      {data}
    </pre>
  );
}
