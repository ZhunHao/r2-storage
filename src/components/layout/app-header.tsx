"use client";

import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { NewItemDialog } from "@/components/dialogs/new-folder-dialog";
import { RenameDialog } from "@/components/dialogs/rename-dialog";
import { ViewToggle } from "@/components/files/view-toggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useUploadStore } from "@/stores/upload-store";
import {
  createFolder,
  createEmptyFile,
  deleteObject,
  downloadObject,
  moveObject,
  uploadObject,
} from "@/lib/api-client";
import { getFileName } from "@/lib/file-utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleEllipsis,
  Download,
  Eye,
  EyeOff,
  FolderInput,
  FolderPlus,
  Pencil,
  Search,
  Share,
  Trash2,
  Upload,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AppHeaderProps {
  onMoveClick?: () => void;
  onShareClick?: () => void;
}

export function AppHeader({ onMoveClick, onShareClick }: AppHeaderProps) {
  const params = useParams();
  const bucket = params.bucket as string | undefined;
  const pathSegments = (params.path as string[] | undefined) ?? [];
  const prefix = pathSegments.length > 0 ? `${pathSegments.join("/")}/` : "";

  const { open: sidebarOpen, isMobile } = useSidebar();
  const { readonly, searchQuery, setSearchQuery, showHiddenFiles, setShowHiddenFiles } = useAppStore();
  const { selectedKeys, clearSelection } = useSelectionStore();
  const { addFiles, updateProgress, setStatus } = useUploadStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const count = selectedKeys.size;
  const disabled = count === 0;
  const isSingle = count === 1;

  const renameKey = isSingle ? Array.from(selectedKeys)[0] : null;
  const renameCurrentName = renameKey ? getFileName(renameKey) : "";
  const renameIsFolder = renameKey ? renameKey.endsWith("/") : false;

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !bucket) return;

      const fileArray = Array.from(files);
      const uploadFiles = fileArray.map((file) => ({
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
      e.target.value = "";
    },
    [bucket, prefix, addFiles, updateProgress, setStatus, queryClient]
  );

  const handleDownload = useCallback(async () => {
    if (!bucket) return;
    const fileKeys = Array.from(selectedKeys).filter(
      (key) => !key.endsWith("/")
    );

    if (fileKeys.length === 0) {
      toast.warning("No files to download. Folders cannot be downloaded.");
      return;
    }

    const skipped = selectedKeys.size - fileKeys.length;
    const toastId = toast.loading(`Downloading ${fileKeys.length} file(s)...`);

    let succeeded = 0;
    let failed = 0;

    for (const key of fileKeys) {
      try {
        const res = await downloadObject(bucket, key);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getFileName(key);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        succeeded++;
        await sleep(300);
      } catch {
        failed++;
      }
    }

    toast.dismiss(toastId);
    if (failed > 0) {
      toast.error(`${failed} download(s) failed`);
    } else {
      const msg =
        skipped > 0
          ? `Downloaded ${succeeded} file(s). ${skipped} folder(s) skipped.`
          : `Downloaded ${succeeded} file(s)`;
      toast.success(msg);
    }
  }, [bucket, selectedKeys]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!bucket) return;

    try {
      await Promise.all(
        Array.from(selectedKeys).map((key) => deleteObject(bucket, key))
      );
      queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
      queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
      clearSelection();
      toast.success(`Deleted ${count} item(s)`);
    } catch {
      toast.error("Some deletions failed");
    }
  }, [bucket, prefix, count, selectedKeys, clearSelection, queryClient]);

  const handleRenameClick = useCallback(() => {
    if (!isSingle) return;
    setRenameDialogOpen(true);
  }, [isSingle]);

  const handleRenameConfirmed = useCallback(
    async (newName: string) => {
      if (!renameKey || !bucket) return;
      const currentName = getFileName(renameKey);
      const parentPath = renameKey.substring(0, renameKey.lastIndexOf(currentName));
      const newKey = `${parentPath}${newName}${renameIsFolder ? "/" : ""}`;
      try {
        await moveObject(bucket, renameKey, newKey);
        queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
        queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
        clearSelection();
        toast.success(`Renamed to ${newName}`);
      } catch {
        toast.error("Rename failed");
      }
    },
    [bucket, prefix, renameKey, renameIsFolder, clearSelection, queryClient]
  );

  const handlePreview = useCallback(async () => {
    if (!isSingle || !bucket) return;
    const key = Array.from(selectedKeys)[0];
    if (key.endsWith("/")) return;
    const encodedKey = encodeURIComponent(key);
    window.open(`/api/buckets/${bucket}/object/${encodedKey}`, "_blank");
  }, [bucket, isSingle, selectedKeys]);

  const handleNewFolderClick = useCallback(() => {
    setNewFolderDialogOpen(true);
  }, []);

  const handleNewItemConfirmed = useCallback(
    async (name: string, mode: "folder" | "file") => {
      if (!bucket) return;
      try {
        if (mode === "folder") {
          await createFolder(bucket, `${prefix}${name}`);
          toast.success(`Created folder "${name}"`);
        } else {
          await createEmptyFile(bucket, `${prefix}${name}`);
          toast.success(`Created file "${name}"`);
        }
        queryClient.invalidateQueries({ queryKey: ["files", bucket, prefix] });
        queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
      } catch {
        toast.error(`Failed to create ${mode}`);
      }
    },
    [bucket, prefix, queryClient]
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const btnClass =
    "h-7 rounded-lg px-1.5 text-accent-blue hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-[background-color] duration-150";

  return (
    <header className="actions-toolbar flex h-10 shrink-0 items-center">
      {/* Navigation & view controls */}
      <div className="actions-group-start flex shrink-0 items-center justify-start px-2.5">
        {(isMobile || !sidebarOpen) && (
          <SidebarTrigger className="-ml-1 mr-2 text-text-tertiary hover:text-text-primary" />
        )}
        <ViewToggle />
        {bucket && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 rounded-lg px-1.5 transition-[background-color] duration-150 ${
              showHiddenFiles
                ? "text-accent-blue hover:bg-surface-hover"
                : "text-text-tertiary hover:bg-surface-hover"
            }`}
            onClick={() => setShowHiddenFiles(!showHiddenFiles)}
            title={showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content creation */}
      <div className="actions-group-middle flex flex-1 items-center justify-center gap-1.5 px-2.5">
        {!readonly && bucket && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={btnClass}
              onClick={handleUploadClick}
              title="Upload"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={btnClass}
              onClick={handleNewFolderClick}
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {/* Item actions & search */}
      <div className="actions-group-end flex shrink items-center justify-end gap-1.5 px-2.5">
        {bucket && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={btnClass}
              disabled={disabled}
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={btnClass}
              disabled={disabled || !isSingle}
              onClick={() => onShareClick?.()}
              title="Share"
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={btnClass}
              disabled={disabled}
              onClick={handleDeleteClick}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={disabled}
                className={`inline-flex items-center justify-center ${btnClass} outline-none`}
              >
                <CircleEllipsis className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem disabled={!isSingle} onClick={handlePreview}>
                  <Eye className="h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!isSingle}
                  onClick={() => onShareClick?.()}
                >
                  <Share className="h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!isSingle} onClick={handleRenameClick}>
                  <Pencil className="h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMoveClick?.()}>
                  <FolderInput className="h-4 w-4" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Search field */}
        <div
          className="flex items-center gap-1.5 rounded-lg bg-search-bg transition-all"
          style={{
            width: 260,
            height: 32,
            padding: "0 6px 0 7px",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-search-icon" />
          <input
            type="text"
            placeholder="Search Drive"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-transparent text-sm text-search-text placeholder:text-text-placeholder outline-none"
          />
        </div>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemCount={count}
        onConfirm={handleDeleteConfirmed}
      />
      <NewItemDialog
        open={newFolderDialogOpen}
        onOpenChange={setNewFolderDialogOpen}
        onConfirm={handleNewItemConfirmed}
      />
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentName={renameCurrentName}
        isFolder={renameIsFolder}
        onConfirm={handleRenameConfirmed}
      />
    </header>
  );
}
