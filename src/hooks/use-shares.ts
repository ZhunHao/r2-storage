"use client";

import { listShares } from "@/lib/api-client";
import { useAppStore } from "@/stores/app-store";
import type { ShareMetadata } from "@/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Fetch shares for a single bucket.
 * Returns a Set of file keys that have active (non-expired) share links.
 */
export function useShares(bucket: string | null) {
  const query = useQuery({
    queryKey: ["shares", bucket],
    queryFn: () => listShares(bucket!),
    enabled: !!bucket,
  });

  const sharedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!query.data?.shares) return keys;

    const now = Date.now();
    for (const share of query.data.shares) {
      const isExpired = share.expiresAt ? now > share.expiresAt : false;
      if (!isExpired) {
        keys.add(share.key);
      }
    }
    return keys;
  }, [query.data]);

  return { ...query, sharedKeys };
}

/** A share entry enriched with its source bucket name. */
export type ShareEntry = ShareMetadata & {
  isExpired: boolean;
};

/**
 * Fetch shares from ALL buckets and merge into a single list.
 * Used by the consolidated Manage Shares page.
 */
export function useAllShares() {
  const { buckets } = useAppStore();

  const queries = useQueries({
    queries: buckets.map((b) => ({
      queryKey: ["shares", b.name],
      queryFn: () => listShares(b.name),
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const allShares: ShareEntry[] = useMemo(() => {
    const now = Date.now();
    const result: ShareEntry[] = [];

    for (const q of queries) {
      if (!q.data?.shares) continue;
      for (const share of q.data.shares) {
        result.push({
          ...share,
          isExpired: share.expiresAt ? now > share.expiresAt : false,
        });
      }
    }

    // Sort by creation date, newest first
    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }, [queries]);

  return { allShares, isLoading, isError, queries };
}
