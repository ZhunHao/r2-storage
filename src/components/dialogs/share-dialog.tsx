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
import { createShareLink } from "@/lib/api-client";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  fileKey: string;
  fileName: string;
}

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
  { label: "Never", value: 0 },
];

export function ShareDialog({
  open,
  onOpenChange,
  bucket,
  fileKey,
  fileName,
}: ShareDialogProps) {
  const [expiresIn, setExpiresIn] = useState(604800); // 7 days default
  const [maxDownloads, setMaxDownloads] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      const result = await createShareLink(bucket, fileKey, {
        expiresInSeconds: expiresIn || undefined,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : undefined,
      });
      setShareUrl(result.url);
      queryClient.invalidateQueries({ queryKey: ["shares", bucket] });
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  }, [bucket, fileKey, expiresIn, maxDownloads]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setExpiresIn(604800);
        setMaxDownloads("");
        setShareUrl(null);
        setCopied(false);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Create a shareable link for this file.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Expires in</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EXPIRY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={expiresIn === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExpiresIn(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Max downloads (optional)
              </label>
              <Input
                type="number"
                placeholder="Unlimited"
                min="1"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {expiresIn > 0 &&
                `Expires in ${EXPIRY_OPTIONS.find((o) => o.value === expiresIn)?.label}. `}
              {maxDownloads && `Limited to ${maxDownloads} downloads.`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
