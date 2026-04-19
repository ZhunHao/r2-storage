"use client";

import type { BucketInfo, FileItem, SortField, ViewMode } from "@/types";
import { create } from "zustand";

interface AppState {
  // Bucket state
  buckets: BucketInfo[];
  selectedBucket: string | null;

  // UI state
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: "asc" | "desc";
  sidebarCollapsed: boolean;
  readonly: boolean;
  searchQuery: string;
  showHiddenFiles: boolean;

  // Preview state
  previewFile: FileItem | null;
  setPreviewFile: (file: FileItem | null) => void;
  closePreview: () => void;

  // Actions
  setBuckets: (buckets: BucketInfo[]) => void;
  setSelectedBucket: (bucket: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  toggleSidebar: () => void;
  setReadonly: (readonly: boolean) => void;
  setSearchQuery: (query: string) => void;
  setShowHiddenFiles: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  buckets: [],
  selectedBucket: null,
  viewMode:
    (typeof window !== "undefined"
      ? (localStorage.getItem("r2-view-mode") as ViewMode)
      : null) ?? "list",
  sortField:
    (typeof window !== "undefined"
      ? (localStorage.getItem("r2-sort-field") as SortField)
      : null) ?? "name",
  sortDirection:
    (typeof window !== "undefined"
      ? (localStorage.getItem("r2-sort-direction") as "asc" | "desc")
      : null) ?? "asc",
  sidebarCollapsed: false,
  readonly: true,
  searchQuery: "",
  showHiddenFiles:
    (typeof window !== "undefined"
      ? localStorage.getItem("r2-show-hidden") === "true"
      : false),
  previewFile: null,

  setBuckets: (buckets) => set({ buckets }),

  setSelectedBucket: (bucket) => set({ selectedBucket: bucket }),

  setViewMode: (mode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("r2-view-mode", mode);
    }
    set({ viewMode: mode });
  },

  setSortField: (field) =>
    set((state) => {
      const direction =
        state.sortField === field
          ? state.sortDirection === "asc" ? "desc" : "asc"
          : "asc";
      if (typeof window !== "undefined") {
        localStorage.setItem("r2-sort-field", field);
        localStorage.setItem("r2-sort-direction", direction);
      }
      return { sortField: field, sortDirection: direction };
    }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setReadonly: (readonly) => set({ readonly }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowHiddenFiles: (show) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("r2-show-hidden", String(show));
    }
    set({ showHiddenFiles: show });
  },

  setPreviewFile: (file) => set({ previewFile: file }),
  closePreview: () => set({ previewFile: null }),
}));
