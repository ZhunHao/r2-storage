"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerConfig } from "@/hooks/use-server-config";
import { useAllShares } from "@/hooks/use-shares";
import { deleteShare } from "@/lib/api-client";
import { formatBucketName, getFileName } from "@/lib/file-utils";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-text-tertiary" />
      )}
    </Button>
  );
}

export default function SharesPage() {
  useServerConfig();
  const { allShares, isLoading } = useAllShares();
  const queryClient = useQueryClient();

  const handleRevoke = useCallback(
    async (bucket: string, shareId: string) => {
      try {
        await deleteShare(bucket, shareId);
        queryClient.invalidateQueries({ queryKey: ["shares", bucket] });
        toast.success("Share link revoked");
      } catch {
        toast.error("Failed to revoke share link");
      }
    },
    [queryClient]
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Page title */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Link2 className="h-5 w-5 text-text-secondary" />
          <h1 className="text-[22px] font-semibold text-text-primary">
            Shared Links
          </h1>
        </div>
        <p className="mt-1 text-[13px] text-text-secondary">
          {allShares.length === 0
            ? "No shared links yet"
            : `${allShares.length} shared link${allShares.length === 1 ? "" : "s"} across all buckets`}
        </p>
      </div>

      {allShares.length > 0 && (
        <div className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow
                className="hover:bg-transparent"
                style={{ borderColor: "var(--divider-light)" }}
              >
                <TableHead className="text-[13px] font-medium text-text-secondary">
                  File
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary">
                  Bucket
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary">
                  Share URL
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary text-center">
                  Status
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary text-center">
                  Downloads
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary">
                  Created
                </TableHead>
                <TableHead className="text-[13px] font-medium text-text-secondary text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allShares.map((share) => {
                const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.id}`;
                return (
                  <TableRow
                    key={share.id}
                    style={{ borderColor: "var(--divider-light)" }}
                  >
                    {/* File name */}
                    <TableCell className="text-[13px] text-text-primary font-medium max-w-[200px]">
                      <span className="truncate block" title={share.key}>
                        {getFileName(share.key)}
                      </span>
                    </TableCell>

                    {/* Bucket */}
                    <TableCell className="text-[13px] text-text-secondary">
                      {formatBucketName(share.bucket)}
                    </TableCell>

                    {/* Share URL */}
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[13px] text-accent-blue truncate block cursor-pointer hover:underline"
                          onClick={() => window.open(shareUrl, "_blank")}
                          title={shareUrl}
                        >
                          {shareUrl}
                        </span>
                        <CopyButton text={shareUrl} />
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: share.isExpired
                            ? "rgba(255, 59, 48, 0.12)"
                            : "rgba(52, 199, 89, 0.12)",
                          color: share.isExpired ? "#FF3B30" : "#34C759",
                        }}
                      >
                        {share.isExpired ? "Expired" : "Active"}
                      </span>
                    </TableCell>

                    {/* Downloads */}
                    <TableCell className="text-[13px] text-text-secondary text-center">
                      {share.currentDownloads}
                      <span className="text-text-quaternary">
                        {" / "}
                        {share.maxDownloads ?? "∞"}
                      </span>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-[13px] text-text-secondary">
                      {formatDate(share.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-danger hover:text-danger hover:bg-danger/10"
                        onClick={() => handleRevoke(share.bucket, share.id)}
                        title="Revoke share link"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {allShares.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Link2 className="h-12 w-12 text-empty-icon mb-4" />
          <p className="text-[15px] text-text-secondary">
            No shared links found
          </p>
          <p className="text-[13px] text-text-tertiary mt-1">
            Share a file from any bucket to create a link
          </p>
        </div>
      )}
    </div>
  );
}
