"use client";

import { ChatPanel } from "@/components/preview/chat-panel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AudioPreview } from "@/components/preview/audio-preview";
import { CodePreview } from "@/components/preview/code-preview";
import { CsvPreview } from "@/components/preview/csv-preview";
import { GzipLogPreview } from "@/components/preview/gzip-log-preview";
import { HtmlPreview } from "@/components/preview/html-preview";
import { ImagePreview } from "@/components/preview/image-preview";
import { JsonPreview } from "@/components/preview/json-preview";
import { MarkdownPreview } from "@/components/preview/markdown-preview";
import { PdfPreview } from "@/components/preview/pdf-preview";
import { UnsupportedPreview } from "@/components/preview/unsupported-preview";
import { VideoPreview } from "@/components/preview/video-preview";
import { isChatSupported } from "@/lib/chat-prompt";
import {
  formatBytes,
  getContentType,
  getFileKind,
  getFileName,
  getPreviewKind,
  type PreviewKind,
} from "@/lib/file-utils";
import { useAppStore } from "@/stores/app-store";
import { MessageSquare } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface PreviewDialogProps {
  bucket: string;
}

function renderBody(
  kind: PreviewKind,
  bucket: string,
  fileKey: string,
  fileName: string
): React.ReactElement {
  switch (kind) {
    case "image":
      return <ImagePreview bucket={bucket} fileKey={fileKey} fileName={fileName} />;
    case "video":
      return <VideoPreview bucket={bucket} fileKey={fileKey} />;
    case "audio":
      return <AudioPreview bucket={bucket} fileKey={fileKey} fileName={fileName} />;
    case "pdf":
      return <PdfPreview bucket={bucket} fileKey={fileKey} fileName={fileName} />;
    case "code":
      return <CodePreview bucket={bucket} fileKey={fileKey} />;
    case "markdown":
      return <MarkdownPreview bucket={bucket} fileKey={fileKey} />;
    case "json":
      return <JsonPreview bucket={bucket} fileKey={fileKey} />;
    case "csv":
      return <CsvPreview bucket={bucket} fileKey={fileKey} />;
    case "html":
      return <HtmlPreview bucket={bucket} fileKey={fileKey} />;
    case "gzip-log":
      return <GzipLogPreview bucket={bucket} fileKey={fileKey} />;
    case "unsupported":
      return <UnsupportedPreview bucket={bucket} fileKey={fileKey} fileName={fileName} />;
  }
}

export function PreviewDialog({ bucket }: PreviewDialogProps) {
  const { previewFile, closePreview } = useAppStore();
  const [chatOpen, setChatOpen] = useState(false);
  const open = Boolean(previewFile && !previewFile.isFolder);

  if (!previewFile || previewFile.isFolder) return null;

  const fileName = getFileName(previewFile.key);
  const kind = getPreviewKind(previewFile.key);
  const displayKind = getFileKind(previewFile.key);
  const ct = previewFile.contentType ?? getContentType(fileName);
  const canChat = isChatSupported(ct);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setChatOpen(false);
          closePreview();
        }
      }}
    >
      <DialogContent className="flex h-[90vh] w-[min(95vw,1400px)] max-w-none flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-medium">{fileName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {formatBytes(previewFile.size)} · {displayKind}
            </DialogDescription>
          </div>
          {canChat && (
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="sm"
              onClick={() => setChatOpen((v) => !v)}
              className="ml-4"
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              {chatOpen ? "Close chat" : "Chat"}
            </Button>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex-1 overflow-auto bg-muted/20 p-4">
            {renderBody(kind, bucket, previewFile.key, fileName)}
          </div>
          {canChat && chatOpen && <ChatPanel bucket={bucket} fileKey={previewFile.key} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
