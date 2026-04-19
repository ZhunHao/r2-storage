"use client";

import { FolderOpen, SearchX } from "lucide-react";

interface EmptyStateProps {
  isSearching?: boolean;
}

export function EmptyState({ isSearching = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      {isSearching ? (
        <SearchX className="h-14 w-14 text-empty-icon" />
      ) : (
        <FolderOpen className="h-14 w-14 text-empty-icon" />
      )}
      <div className="text-center">
        <p className="text-[15px] font-medium text-text-secondary">
          {isSearching ? "No results found" : "This folder is empty"}
        </p>
        <p className="text-[13px] mt-1 text-text-secondary">
          {isSearching
            ? "Try a different search term"
            : "Drop files here or use the upload button"}
        </p>
      </div>
    </div>
  );
}
