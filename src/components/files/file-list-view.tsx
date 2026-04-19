"use client";

import {
  formatBytes,
  formatDate,
  getFileKind,
  getMimeCategory,
} from "@/lib/file-utils";
import { useAppStore } from "@/stores/app-store";
import { useSelectionStore } from "@/stores/selection-store";
import type { FileItem, SortField } from "@/types";
import {
  ArrowDown,
  ArrowUp,
  CircleEllipsis,
  File,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileListViewProps {
  items: FileItem[];
  bucket: string;
  sharedKeys?: Set<string>;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onNavigate: (item: FileItem) => void;
  onDeleteRequest?: () => void;
}

const GRID_COLUMNS = "48px minmax(200px, 1fr) 160px 90px 160px 80px 48px";

function SortableHeader({
  field,
  label,
  activeField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  activeField: SortField;
  direction: "asc" | "desc";
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === activeField;
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <div
      role="columnheader"
      className={`flex items-center gap-1 cursor-pointer hover:text-text-primary select-none ${className ?? ""}`}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && <Icon className="h-3 w-3" />}
    </div>
  );
}

function FileIcon({ item }: { item: FileItem }) {
  const size = "h-6 w-6";
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

export function FileListView({
  items,
  bucket,
  sharedKeys,
  onContextMenu,
  onNavigate,
  onDeleteRequest,
}: FileListViewProps) {
  const { sortField, sortDirection, setSortField } = useAppStore();
  const { selectedKeys, select, toggleSelect, rangeSelect, selectAll, clearSelection, isSelected } =
    useSelectionStore();
  const allKeys = items.map((i) => i.key);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [items]);

  useEffect(() => {
    focusedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const handleClick = useCallback(
    (e: React.MouseEvent, key: string, index: number) => {
      e.stopPropagation();
      setFocusedIndex(index);
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = items.length;
      if (len === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = focusedIndex < len - 1 ? focusedIndex + 1 : focusedIndex;
          setFocusedIndex(next);
          if (e.shiftKey) {
            rangeSelect(items[next].key, allKeys);
          } else {
            select(items[next].key);
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = focusedIndex > 0 ? focusedIndex - 1 : 0;
          setFocusedIndex(prev);
          if (e.shiftKey) {
            rangeSelect(items[prev].key, allKeys);
          } else {
            select(items[prev].key);
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < len) {
            onNavigate(items[focusedIndex]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          clearSelection();
          setFocusedIndex(-1);
          break;
        }
        case "a": {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            selectAll(allKeys);
          }
          break;
        }
        case "Backspace":
        case "Delete": {
          if (selectedKeys.size > 0) {
            e.preventDefault();
            onDeleteRequest?.();
          }
          break;
        }
      }
    },
    [focusedIndex, items, allKeys, select, rangeSelect, selectAll, clearSelection, selectedKeys, onNavigate, onDeleteRequest]
  );

  return (
    <div
      ref={containerRef}
      className="w-full outline-none"
      role="grid"
      aria-label="File list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Column headers */}
      <div
        role="row"
        className="grid items-center px-5 py-2 text-[14px] font-normal text-text-secondary select-none"
        style={{ gridTemplateColumns: GRID_COLUMNS, borderBottom: "1px solid var(--divider-light)" }}
      >
        <div role="columnheader" />
        <SortableHeader field="name" label="Name" activeField={sortField} direction={sortDirection} onSort={setSortField} />
        <SortableHeader field="kind" label="Kind" activeField={sortField} direction={sortDirection} onSort={setSortField} className="hidden md:block px-3" />
        <SortableHeader field="size" label="Size" activeField={sortField} direction={sortDirection} onSort={setSortField} className="hidden sm:block px-3" />
        <SortableHeader field="date" label="Date" activeField={sortField} direction={sortDirection} onSort={setSortField} className="hidden lg:block px-3" />
        <div role="columnheader" className="hidden xl:block px-3">Shared</div>
        <div role="columnheader" />
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {items.map((item, index) => {
          const selected = isSelected(item.key);
          const isFocused = index === focusedIndex;

          return (
            <div
              key={item.key}
              ref={isFocused ? focusedRowRef : undefined}
              role="row"
              aria-selected={selected}
              className="group grid items-center px-5 cursor-pointer transition-[background-color] duration-100"
              style={{
                gridTemplateColumns: GRID_COLUMNS,
                height: item.location !== undefined ? 52 : 41,
                borderRadius: 10,
                borderBottom: "1px solid var(--divider-light)",
                backgroundColor: selected
                  ? "var(--surface-selected)"
                  : undefined,
                outline: isFocused && !selected ? "2px solid var(--accent-blue)" : undefined,
                outlineOffset: "-2px",
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = "";
                }
              }}
              onClick={(e) => handleClick(e, item.key, index)}
              onDoubleClick={(e) => handleDoubleClick(e, item)}
              onContextMenu={(e) => onContextMenu(e, item)}
            >
              {/* Preview icon */}
              <div role="gridcell" className="flex items-center justify-center">
                <FileIcon item={item} />
              </div>

              {/* Name */}
              <div role="gridcell" className="min-w-0">
                <span
                  className="text-[14px] truncate block"
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
                    className="text-[11px] truncate block"
                    style={{
                      color: selected
                        ? "var(--text-selected)"
                        : "var(--text-secondary)",
                    }}
                  >
                    in {item.location || "/"}
                  </span>
                )}
              </div>

              {/* Kind */}
              <div
                role="gridcell"
                className="text-[14px] truncate hidden md:block px-3"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                {item.isFolder ? "Folder" : getFileKind(item.key)}
              </div>

              {/* Size */}
              <div
                role="gridcell"
                className="text-[14px] hidden sm:block px-3"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                {item.isFolder ? "--" : formatBytes(item.size)}
              </div>

              {/* Date */}
              <div
                role="gridcell"
                className="text-[14px] hidden lg:block px-3"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                {item.uploaded ? formatDate(item.uploaded) : "--"}
              </div>

              {/* Shared */}
              <div
                role="gridcell"
                className="text-[14px] hidden xl:block px-3"
                style={{
                  color: selected
                    ? "var(--text-selected)"
                    : "var(--text-secondary)",
                }}
              >
                {!item.isFolder && sharedKeys?.has(item.key) ? "Shared" : ""}
              </div>

              {/* Meatball action */}
              <div role="gridcell" className="flex items-center justify-center">
                <button
                  className={`h-7 w-7 flex items-center justify-center rounded-full transition-all duration-150 ${
                    selected
                      ? "opacity-100 hover:bg-white/20"
                      : "opacity-0 group-hover:opacity-100 hover:bg-surface-hover"
                  }`}
                  style={{
                    color: selected
                      ? "var(--text-selected)"
                      : "var(--text-secondary)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selected) select(item.key);
                    onContextMenu(e, item);
                  }}
                >
                  <CircleEllipsis className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
