"use client";

import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/stores/upload-store";
import { CheckCircle, Loader2, X, XCircle } from "lucide-react";

export function UploadProgress() {
  const { files, clearCompleted, removeFile } = useUploadStore();

  if (files.length === 0) return null;

  const completed = files.filter((f) => f.status === "completed").length;
  const failed = files.filter((f) => f.status === "failed").length;
  const uploading = files.filter(
    (f) => f.status === "uploading" || f.status === "pending"
  ).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">
          {uploading > 0
            ? `Uploading ${uploading} file(s)...`
            : `${completed} uploaded${failed > 0 ? `, ${failed} failed` : ""}`}
        </span>
        {uploading === 0 && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto p-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 rounded px-2 py-1.5"
          >
            {file.status === "uploading" && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {file.status === "completed" && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {file.status === "failed" && (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            {file.status === "pending" && (
              <div className="h-4 w-4 rounded-full border-2 border-muted" />
            )}
            <span className="flex-1 truncate text-sm">{file.file.name}</span>
            {file.status === "uploading" && (
              <span className="text-xs text-muted-foreground">
                {Math.round(file.progress)}%
              </span>
            )}
            {file.status === "failed" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
