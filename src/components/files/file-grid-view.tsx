"use client";

import { formatBytes, getMimeCategory } from "@/lib/file-utils";
import { useSelectionStore } from "@/stores/selection-store";
import type { FileItem } from "@/types";
import {
  File,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
} from "lucide-react";
import { useCallback } from "react";

interface FileGridViewProps {
  items: FileItem[];
  bucket: string;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onNavigate: (item: FileItem) => void;
}

function FileIcon({ item }: { item: FileItem }) {
  const size = "h-12 w-12";
  if (item.isFolder) return <Folder className={`${size} text-icon-folder`} />;

  const category = getMimeCategory(item.key);
  switch (category) {
    case "image":
      return <FileImage className={`${size} text-icon-image`} />;
    case "video":
      return <FileVideo className={`${size} text-icon-video`} />;
    case "audio":
      return <FileAudio className={`${size} text-icon-audio`} />;
    case "text":
      return <FileText className={`${size} text-icon-text`} />;
    case "code":
      return <FileCode className={`${size} text-icon-code`} />;
    case "pdf":
      return <FileText className={`${size} text-icon-pdf`} />;
    default:
      return <File className={`${size} text-icon-text`} />;
  }
}

export function FileGridView({
  items,
  bucket,
  onContextMenu,
  onNavigate,
}: FileGridViewProps) {
  const { select, toggleSelect, rangeSelect, isSelected } =
    useSelectionStore();
  const allKeys = items.map((i) => i.key);

  const handleClick = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.stopPropagation();
      if (e.shiftKey) {
        rangeSelect(key, allKeys);
      } else if (e.metaKey || e.ctrlKey) {
        toggleSelect(key);
      } else {
        select(key);
      }
    },
    [allKeys, rangeSelect, toggleSelect, select]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, item: FileItem) => {
      e.stopPropagation();
      onNavigate(item);
    },
    [onNavigate]
  );

  return (
    <div className="grid grid-cols-2 gap-1 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => {
        const selected = isSelected(item.key);

        return (
          <div
            key={item.key}
            className="flex flex-col items-center gap-1.5 rounded-xl p-4 cursor-pointer transition-[background-color] duration-100"
            style={{
              backgroundColor: selected
                ? "var(--surface-selected)"
                : undefined,
            }}
            onMouseEnter={(e) => {
              if (!selected) e.currentTarget.style.backgroundColor = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (!selected) e.currentTarget.style.backgroundColor = "";
            }}
            onClick={(e) => handleClick(e, item.key)}
            onDoubleClick={(e) => handleDoubleClick(e, item)}
            onContextMenu={(e) => onContextMenu(e, item)}
          >
            <FileIcon item={item} />
            <span
              className="w-full text-center text-[12px] line-clamp-2 leading-tight"
              style={{
                fontWeight: selected ? 500 : 400,
                color: selected
                  ? "var(--text-selected)"
                  : "var(--text-primary)",
              }}
            >
              {item.name}
            </span>
            {item.location !== undefined && (
              <span
                className="w-full text-center text-[11px] truncate"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                in {item.location || "/"}
              </span>
            )}
            {!item.isFolder && (
              <span
                className="text-[11px]"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                {formatBytes(item.size)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
