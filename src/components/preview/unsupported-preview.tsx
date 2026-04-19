"use client";

import { Button } from "@/components/ui/button";
import { getObjectUrl } from "@/lib/file-utils";
import { Download } from "lucide-react";

interface UnsupportedPreviewProps {
  bucket: string;
  fileKey: string;
  fileName: string;
}

export function UnsupportedPreview({ bucket, fileKey, fileName }: UnsupportedPreviewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        Preview is not available for this file type.
      </p>
      <Button
        variant="secondary"
        render={<a href={getObjectUrl(bucket, fileKey)} download={fileName} />}
      >
        <Download className="mr-2 h-4 w-4" />
        Download instead
      </Button>
    </div>
  );
}
