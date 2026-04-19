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
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";

type ItemMode = "folder" | "file";

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, mode: ItemMode) => void;
}

export function NewItemDialog({
  open,
  onOpenChange,
  onConfirm,
}: NewItemDialogProps) {
  const [mode, setMode] = useState<ItemMode>("folder");
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(mode === "file" ? "untitled.txt" : "");
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();
          if (mode === "file") {
            const dotIndex = "untitled.txt".lastIndexOf(".");
            input.setSelectionRange(0, dotIndex);
          }
        }
      });
    }
  }, [open, mode]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      onConfirm(trimmed, mode);
      onOpenChange(false);
    },
    [name, mode, onConfirm, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "folder" ? "New Folder" : "New File"}
          </DialogTitle>
          <DialogDescription>
            {mode === "folder"
              ? "Enter a name for the new folder."
              : "Enter a name for the new file."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pb-2">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "folder"
                ? "bg-surface-hover text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
            onClick={() => setMode("folder")}
          >
            Folder
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "file"
                ? "bg-surface-hover text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
            onClick={() => setMode("file")}
          >
            File
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-4">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === "folder" ? "Untitled Folder" : "untitled.txt"
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
