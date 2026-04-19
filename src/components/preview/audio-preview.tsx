"use client";

import { getObjectUrl } from "@/lib/file-utils";

interface AudioPreviewProps {
  bucket: string;
  fileKey: string;
  fileName: string;
}

export function AudioPreview({ bucket, fileKey, fileName }: AudioPreviewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-sm font-medium">{fileName}</p>
      <audio src={getObjectUrl(bucket, fileKey)} controls className="w-[min(90%,600px)]">
        Your browser does not support inline audio playback.
      </audio>
    </div>
  );
}
