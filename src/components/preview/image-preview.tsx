"use client";

import { getObjectUrl } from "@/lib/file-utils";

interface ImagePreviewProps {
  bucket: string;
  fileKey: string;
  fileName: string;
}

export function ImagePreview({ bucket, fileKey, fileName }: ImagePreviewProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <div className="flex h-full items-center justify-center">
      <img
        src={getObjectUrl(bucket, fileKey)}
        alt={fileName}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
