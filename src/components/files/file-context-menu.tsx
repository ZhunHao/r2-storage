"use client";

import { downloadObject } from "@/lib/api-client";
import { getFileName } from "@/lib/file-utils";
import { useSelectionStore } from "@/stores/selection-store";
import type { FileItem } from "@/types";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  FolderInput,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";

interface FileContextMenuProps {
  item: FileItem;
  bucket: string;
  prefix: string;
  position: { x: number; y: number };
  onClose: () => void;
  onShare?: (item: FileItem) => void;
  onDelete?: (item: FileItem) => void;
  onRename?: (item: FileItem) => void;
  onPreview?: (item: FileItem) => void;
}

export function FileContextMenu({
  item,
  bucket,
  prefix,
  position,
  onClose,
  onShare,
  onDelete,
  onRename,
  onPreview,
}: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { select } = useSelectionStore();
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null);

  // Measure the menu after render and clamp to viewport (like iCloud Drive)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const MARGIN = 8;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // If the menu would overflow the right edge, flip to the left of the click point
    if (x + rect.width > vw - MARGIN) {
      x = Math.max(MARGIN, x - rect.width);
    }
    // If the menu would overflow the bottom edge, move it up
    if (y + rect.height > vh - MARGIN) {
      y = Math.max(MARGIN, vh - rect.height - MARGIN);
    }

    setAdjustedPos({ x, y });
  }, [position]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    onClose();
    try {
      const res = await downloadObject(bucket, item.key);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName(item.key);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  }, [bucket, item.key, onClose]);

  const handleDelete = useCallback(() => {
    onClose();
    onDelete?.(item);
  }, [item, onClose, onDelete]);

  const handleRename = useCallback(() => {
    onClose();
    onRename?.(item);
  }, [item, onClose, onRename]);

  const handleOpen = useCallback(() => {
    onClose();
    if (item.isFolder) {
      router.push(`/${bucket}/${item.key.replace(/\/$/, "")}`);
    }
  }, [bucket, item, onClose, router]);

  const handleShare = useCallback(() => {
    onClose();
    onShare?.(item);
  }, [item, onClose, onShare]);

  const handleCopyLink = useCallback(async () => {
    onClose();
    const url = `${window.location.origin}/api/buckets/${bucket}/object/${encodeURIComponent(item.key)}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }, [bucket, item.key, onClose]);

  const handleMove = useCallback(() => {
    onClose();
    select(item.key);
    window.dispatchEvent(new Event("r2-move-request"));
  }, [item.key, onClose, select]);

  const handlePreview = useCallback(() => {
    onClose();
    onPreview?.(item);
  }, [item, onClose, onPreview]);

  type MenuItem =
    | { type: "item"; label: string; icon: typeof Download; action: () => void; danger?: boolean; hint?: string }
    | { type: "separator" };

  const menuItems: MenuItem[] = [
    ...(item.isFolder
      ? [{ type: "item" as const, label: "Open", icon: ExternalLink, action: handleOpen }]
      : [
          ...(onPreview ? [{ type: "item" as const, label: "Preview", icon: Eye, action: handlePreview, hint: "Space" }] : []),
          { type: "item" as const, label: "Download", icon: Download, action: handleDownload },
        ]),
    ...(!item.isFolder
      ? [
          { type: "item" as const, label: "Share", icon: Share2, action: handleShare },
          { type: "item" as const, label: "Copy Link", icon: Copy, action: handleCopyLink },
        ]
      : []),
    { type: "separator" as const },
    { type: "item" as const, label: "Move to Folder", icon: FolderInput, action: handleMove },
    { type: "item" as const, label: "Rename", icon: Pencil, action: handleRename },
    { type: "separator" as const },
    { type: "item" as const, label: "Delete", icon: Trash2, action: handleDelete, danger: true },
  ];

  // Use the adjusted position once measured, otherwise use raw position initially
  // (the initial render is needed for measurement; opacity:0 hides the flash)
  const finalPos = adjustedPos ?? position;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-lg p-1 bg-context-menu-bg border border-context-menu-border"
      style={{
        left: finalPos.x,
        top: finalPos.y,
        boxShadow: "0 4px 12px var(--context-menu-shadow)",
        opacity: adjustedPos ? 1 : 0,
        transition: "opacity 60ms ease-out",
      }}
    >
      {menuItems.map((entry, i) =>
        entry.type === "separator" ? (
          <div key={`sep-${i}`} className="my-1 h-px mx-2 bg-border" />
        ) : (
          <button
            key={entry.label}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-[background-color] duration-100 hover:bg-surface-hover"
            style={{
              color: entry.danger
                ? "var(--danger)"
                : "var(--text-primary)",
            }}
            onClick={entry.action}
          >
            <entry.icon className="h-4 w-4" />
            {entry.label}
            {entry.hint && (
              <span className="ml-auto text-xs text-muted-foreground">{entry.hint}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}
