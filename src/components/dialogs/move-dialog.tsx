"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listAllObjects,
  listObjects,
  moveObject,
} from "@/lib/api-client";
import { getFileName } from "@/lib/file-utils";
import { useSelectionStore } from "@/stores/selection-store";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Folder, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  prefix: string;
  selectedKeys: Set<string>;
}

export function MoveDialog({
  open,
  onOpenChange,
  bucket,
  prefix,
  selectedKeys,
}: MoveDialogProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const queryClient = useQueryClient();
  const { clearSelection } = useSelectionStore();

  const fetchFolders = useCallback(
    async (path: string) => {
      setIsLoading(true);
      try {
        const res = await listObjects(bucket, path || undefined);
        const allFolders = res.delimitedPrefixes.filter(
          (f) => !selectedKeys.has(f)
        );
        setFolders(allFolders);
      } catch {
        toast.error("Failed to load folders");
        setFolders([]);
      } finally {
        setIsLoading(false);
      }
    },
    [bucket, selectedKeys]
  );

  useEffect(() => {
    if (open) {
      setCurrentPath("");
      fetchFolders("");
    }
  }, [open, fetchFolders]);

  const navigateToFolder = useCallback(
    (folderPath: string) => {
      setCurrentPath(folderPath);
      fetchFolders(folderPath);
    },
    [fetchFolders]
  );

  const breadcrumbSegments = currentPath
    ? currentPath.replace(/\/$/, "").split("/")
    : [];

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === -1) {
        navigateToFolder("");
      } else {
        const path = breadcrumbSegments.slice(0, index + 1).join("/") + "/";
        navigateToFolder(path);
      }
    },
    [breadcrumbSegments, navigateToFolder]
  );

  const handleMove = useCallback(async () => {
    const keys = Array.from(selectedKeys);
    const count = keys.length;
    setIsMoving(true);

    try {
      for (const key of keys) {
        const isFolder = key.endsWith("/");

        if (isFolder) {
          const objects = await listAllObjects(bucket, key);
          for (const obj of objects) {
            const relativePath = obj.key.slice(key.length);
            const folderName = getFileName(key.replace(/\/$/, "")) + "/";
            const destKey = `${currentPath}${folderName}${relativePath}`;
            await moveObject(bucket, obj.key, destKey);
          }
          // Move the folder marker itself
          const folderName = getFileName(key.replace(/\/$/, "")) + "/";
          await moveObject(bucket, key, `${currentPath}${folderName}`);
        } else {
          const fileName = getFileName(key);
          await moveObject(bucket, key, `${currentPath}${fileName}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["files", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-index", bucket] });
      queryClient.invalidateQueries({ queryKey: ["bucket-total", bucket] });
      clearSelection();
      onOpenChange(false);
      toast.success(`Moved ${count} item(s)`);
    } catch {
      toast.error("Some moves failed");
    } finally {
      setIsMoving(false);
    }
  }, [
    bucket,
    currentPath,
    selectedKeys,
    clearSelection,
    queryClient,
    onOpenChange,
  ]);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setCurrentPath("");
        setFolders([]);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to...</DialogTitle>
          <DialogDescription>
            Choose a destination folder for {selectedKeys.size} item(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
              className={`hover:underline ${currentPath === "" ? "font-medium text-foreground" : "text-muted-foreground"}`}
              onClick={() => handleBreadcrumbClick(-1)}
            >
              Root
            </button>
            {breadcrumbSegments.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button
                  className={`hover:underline ${i === breadcrumbSegments.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  onClick={() => handleBreadcrumbClick(i)}
                >
                  {segment}
                </button>
              </span>
            ))}
          </div>

          {/* Folder list */}
          <div className="rounded-md border max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No subfolders
              </div>
            ) : (
              folders.map((folderPath) => {
                const name = getFileName(
                  folderPath.replace(/\/$/, "")
                );
                return (
                  <button
                    key={folderPath}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    onClick={() => navigateToFolder(folderPath)}
                  >
                    <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="truncate">{name}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
