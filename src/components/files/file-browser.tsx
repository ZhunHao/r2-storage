"use client";

import { DropZone } from "@/components/upload/drop-zone";
import { FileContextMenu } from "@/components/files/file-context-menu";
import { FileGridView } from "@/components/files/file-grid-view";
import { FileListView } from "@/components/files/file-list-view";
import { EmptyState } from "@/components/files/empty-state";
import { BreadcrumbNav } from "@/components/files/breadcrumb-nav";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { RenameDialog } from "@/components/dialogs/rename-dialog";
import { MoveDialog } from "@/components/dialogs/move-dialog";
import { PreviewDialog } from "@/components/preview/preview-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { UploadProgress } from "@/components/upload/upload-progress";
import { useFileList } from "@/hooks/use-file-list";
import { useBucketSearch } from "@/hooks/use-bucket-search";
import { useBucketTotal } from "@/hooks/use-bucket-total";
import { useShares } from "@/hooks/use-shares";
import { useAppStore } from "@/stores/app-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useUploadStore } from "@/stores/upload-store";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteObject, moveObject } from "@/lib/api-client";
import { getFileName } from "@/lib/file-utils";
import type { FileItem } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

interface FileBrowserProps {
  bucket: string;
  prefix: string;
}

export function FileBrowser({ bucket, prefix }: FileBrowserProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { viewMode, readonly, searchQuery, showHiddenFiles, setPreviewFile, previewFile, setSearchQuery } = useAppStore();
  const folderList = useFileList(bucket, prefix);
  const search = useBucketSearch(bucket, searchQuery);

  const isSearching = search.isEnabled;

  const filteredItems = useMemo(() => {
    if (isSearching) return search.items;
    let result = folderList.items;
    if (!showHiddenFiles) {
      result = result.filter((item) => !item.name.startsWith("."));
    }
    return result;
  }, [isSearching, search.items, folderList.items, showHiddenFiles]);

  const isLoading = isSearching ? search.isLoading : folderList.isLoading;
  const hasNextPage = !isSearching && folderList.hasNextPage;
  const fetchNextPage = folderList.fetchNextPage;

  const { selectedKeys, clearSelection } = useSelectionStore();
  const { isUploading } = useUploadStore();
  const { sharedKeys } = useShares(bucket);
  const [contextItem, setContextItem] = useState<FileItem | null>(null);
  const [contextPosition, setContextPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [shareItem, setShareItem] = useState<FileItem | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState<string[]>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);

  const folderTotalSize = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.isFolder ? 0 : item.size), 0),
    [filteredItems]
  );

  // At the bucket root, swap the per-folder counts for whole-bucket recursive
  // totals so the header matches the analytics page. Deeper paths and search
  // results keep showing the current-view counts.
  const isBucketRoot = !isSearching && prefix === "";
  const bucketTotal = useBucketTotal(bucket, isBucketRoot);
  const itemCount = isBucketRoot && bucketTotal.data
    ? bucketTotal.data.objects
    : filteredItems.length;
  const totalSize = isBucketRoot && bucketTotal.data
    ? bucketTotal.data.bytes
    : folderTotalSize;

  // Expose move/share handlers to header via window events
  useEffect(() => {
    const handleMoveRequest = () => setMoveDialogOpen(true);
    const handleShareRequest = () => {
      const key = Array.from(selectedKeys)[0];
      const item = filteredItems.find((i) => i.key === key);
      if (item) setShareItem(item);
    };

    window.addEventListener("r2-move-request", handleMoveRequest);
    window.addEventListener("r2-share-request", handleShareRequest);
    return () => {
      window.removeEventListener("r2-move-request", handleMoveRequest);
      window.removeEventListener("r2-share-request", handleShareRequest);
    };
  }, [selectedKeys, filteredItems]);

  // Space bar on focused/selected file opens preview (macOS Quick Look style).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Don't re-trigger when a preview is already open
      if (previewFile) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = Array.from(selectedKeys)[0];
      if (!key) return;
      const item = filteredItems.find((i) => i.key === key);
      if (!item || item.isFolder) return;
      e.preventDefault();
      setPreviewFile(item);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredItems, selectedKeys, setPreviewFile, previewFile]);

  // Clear selection when search query changes
  useEffect(() => {
    clearSelection();
  }, [searchQuery, clearSelection]);

  // Reset search query when switching buckets
  useEffect(() => {
    setSearchQuery("");
  }, [bucket, setSearchQuery]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: FileItem) => {
      e.preventDefault();
      setContextItem(item);
      setContextPosition({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleCloseContext = useCallback(() => {
    setContextItem(null);
    setContextPosition(null);
  }, []);

  const handleNavigate = useCallback(
    (item: FileItem) => {
      if (item.isFolder) {
        router.push(`/${bucket}/${item.key.replace(/\/$/, "")}`);
      } else {
        const encodedKey = encodeURIComponent(item.key);
        window.open(`/api/buckets/${bucket}/object/${encodedKey}`, "_blank");
      }
    },
    [bucket, router]
  );

  const handleContextRename = useCallback((item: FileItem) => {
    setRenameItem(item);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirmed = useCallback(
    async (newName: string) => {
      if (!renameItem) return;
      const currentName = getFileName(renameItem.key);
      const parentPath = renameItem.key.substring(
        0,
        renameItem.key.lastIndexOf(currentName)
      );
      const newKey = `${parentPath}${newName}${renameItem.isFolder ? "/" : ""}`;
      try {
        await moveObject(bucket, renameItem.key, newKey);
        queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
        queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
        queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
        clearSelection();
        toast.success(`Renamed to ${newName}`);
      } catch {
        toast.error("Rename failed");
      }
      setRenameItem(null);
    },
    [bucket, prefix, renameItem, clearSelection, queryClient]
  );

  const handleContextDelete = useCallback((item: FileItem) => {
    setPendingDeleteKeys([item.key]);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!bucket || pendingDeleteKeys.length === 0) return;
    try {
      await Promise.all(
        pendingDeleteKeys.map((key) => deleteObject(bucket, key))
      );
      queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
      queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      clearSelection();
      toast.success(`Deleted ${pendingDeleteKeys.length} item(s)`);
    } catch {
      toast.error("Some deletions failed");
    }
    setPendingDeleteKeys([]);
  }, [bucket, prefix, pendingDeleteKeys, clearSelection, queryClient]);

  const handleKeyboardDelete = useCallback(() => {
    if (selectedKeys.size === 0) return;
    setPendingDeleteKeys(Array.from(selectedKeys));
    setDeleteDialogOpen(true);
  }, [selectedKeys]);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isSearching && search.isError) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        Search failed — unable to load the bucket index. Try again.
      </div>
    );
  }

  return (
    <DropZone bucket={bucket} prefix={prefix} disabled={readonly}>
      <div className="relative h-full" onClick={handleBackgroundClick}>
        {/* iCloud-style title area with breadcrumb and item counter */}
        <BreadcrumbNav
          itemCount={itemCount}
          selectedCount={selectedKeys.size}
          totalSize={totalSize}
          isSearching={isSearching}
        />

        {filteredItems.length === 0 ? (
          <EmptyState isSearching={isSearching} />
        ) : viewMode === "grid" ? (
          <FileGridView
            items={filteredItems}
            bucket={bucket}
            onContextMenu={handleContextMenu}
            onNavigate={handleNavigate}
          />
        ) : (
          <FileListView
            items={filteredItems}
            bucket={bucket}
            sharedKeys={sharedKeys}
            onContextMenu={handleContextMenu}
            onNavigate={handleNavigate}
            onDeleteRequest={handleKeyboardDelete}
          />
        )}

        {hasNextPage && (
          <div className="flex justify-center p-4">
            <button
              onClick={() => fetchNextPage()}
              className="text-[13px] text-accent-blue hover:text-accent-blue/70 transition-colors"
            >
              Load more...
            </button>
          </div>
        )}

        {contextItem && contextPosition && (
          <FileContextMenu
            item={contextItem}
            bucket={bucket}
            prefix={prefix}
            position={contextPosition}
            onClose={handleCloseContext}
            onShare={(item) => setShareItem(item)}
            onDelete={handleContextDelete}
            onRename={handleContextRename}
            onPreview={setPreviewFile}
          />
        )}

        {shareItem && (
          <ShareDialog
            open={!!shareItem}
            onOpenChange={(open) => {
              if (!open) {
                setShareItem(null);
                queryClient.invalidateQueries({ queryKey: ["shares", bucket] });
              }
            }}
            bucket={bucket}
            fileKey={shareItem.key}
            fileName={getFileName(shareItem.key)}
          />
        )}

        <MoveDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          bucket={bucket}
          prefix={prefix}
          selectedKeys={selectedKeys}
        />

        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          itemCount={pendingDeleteKeys.length}
          onConfirm={handleDeleteConfirmed}
        />

        {renameItem && (
          <RenameDialog
            open={renameDialogOpen}
            onOpenChange={setRenameDialogOpen}
            currentName={renameItem.name}
            isFolder={renameItem.isFolder}
            onConfirm={handleRenameConfirmed}
          />
        )}

        <PreviewDialog bucket={bucket} />
      </div>

      {isUploading && <UploadProgress />}
    </DropZone>
  );
}
