"use client";

import { getObjectUrl } from "@/lib/file-utils";

interface PdfPreviewProps {
  bucket: string;
  fileKey: string;
  fileName: string;
}

export function PdfPreview({ bucket, fileKey, fileName }: PdfPreviewProps) {
  return (
    <iframe
      src={getObjectUrl(bucket, fileKey)}
      title={fileName}
      className="h-full w-full rounded-sm border bg-white"
    />
  );
}
