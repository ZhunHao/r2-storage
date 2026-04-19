"use client";

import { uploadObject } from "@/lib/api-client";
import { useUploadStore } from "@/stores/upload-store";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import {
  useState,
  useCallback,
  useRef,
  type DragEvent,
  type ReactNode,
} from "react";

interface DropZoneProps {
  bucket: string;
  prefix: string;
  disabled?: boolean;
  children: ReactNode;
}

export function DropZone({ bucket, prefix, disabled, children }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCountRef = useRef(0);
  const { addFiles, updateProgress, setStatus } = useUploadStore();
  const queryClient = useQueryClient();

  const processFiles = useCallback(
    async (files: File[]) => {
      const uploadFiles = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        path: `${prefix}${file.name}`,
        progress: 0,
        status: "pending" as const,
      }));

      addFiles(uploadFiles);

      for (const uf of uploadFiles) {
        setStatus(uf.id, "uploading");
        try {
          await uploadObject(bucket, uf.path, uf.file, (progress) => {
            updateProgress(uf.id, progress);
          });
          setStatus(uf.id, "completed");
        } catch {
          setStatus(uf.id, "failed", "Upload failed");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
      queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
    },
    [bucket, prefix, addFiles, updateProgress, setStatus, queryClient]
  );

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragCountRef.current++;
      if (dragCountRef.current === 1) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragOver(false);
      if (disabled) return;

      const files: File[] = [];

      // Handle DataTransfer items (supports folder drops)
      if (e.dataTransfer.items) {
        for (const item of Array.from(e.dataTransfer.items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      } else {
        files.push(...Array.from(e.dataTransfer.files));
      }

      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-dropzone-bg border-2 border-dashed border-dropzone-border rounded-lg">
          <div className="flex flex-col items-center gap-2 text-dropzone-text">
            <Upload className="h-12 w-12" />
            <span className="text-lg font-medium">Drop files to upload</span>
          </div>
        </div>
      )}
    </div>
  );
}
