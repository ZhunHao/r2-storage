"use client";

import { getObjectUrl } from "@/lib/file-utils";

interface VideoPreviewProps {
  bucket: string;
  fileKey: string;
}

export function VideoPreview({ bucket, fileKey }: VideoPreviewProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <video
        src={getObjectUrl(bucket, fileKey)}
        controls
        className="max-h-full max-w-full"
      >
        Your browser does not support inline video playback.
      </video>
    </div>
  );
}
