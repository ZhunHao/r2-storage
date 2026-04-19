"use client";

import type { UploadFile } from "@/types";
import { create } from "zustand";

interface UploadState {
  files: UploadFile[];
  isUploading: boolean;

  addFiles: (files: UploadFile[]) => void;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (
    id: string,
    status: UploadFile["status"],
    error?: string
  ) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],
  isUploading: false,

  addFiles: (newFiles) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
      isUploading: true,
    })),

  updateProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, progress } : f)),
    })),

  setStatus: (id, status, error) =>
    set((state) => {
      const updatedFiles = state.files.map((f) =>
        f.id === id ? { ...f, status, error } : f
      );
      const isUploading = updatedFiles.some(
        (f) => f.status === "uploading" || f.status === "pending"
      );
      return { files: updatedFiles, isUploading };
    }),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      files: state.files.filter((f) => f.status !== "completed"),
    })),
}));
