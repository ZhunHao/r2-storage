"use client";

import { listAllObjects, type BucketObject } from "@/lib/api-client";
import { getFileName, isFolder } from "@/lib/file-utils";
import { mergeResults, type RankerSemantic, type RankerSubstring } from "@/lib/hybrid-ranker";
import { useAppStore } from "@/stores/app-store";
import type { FileItem } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDebouncedValue } from "./use-debounced-value";
import { useSemanticSearch } from "./use-semantic-search";

const DEBOUNCE_MS = 250;
const STALE_MS = 60_000;

interface UseBucketSearchResult {
  items: FileItem[];
  isLoading: boolean;
  isError: boolean;
  isEnabled: boolean;
}

export function useBucketSearch(
  bucket: string | null,
  query: string
): UseBucketSearchResult {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const enabled = !!bucket && debouncedQuery.length > 0;
  const { showHiddenFiles } = useAppStore();

  const indexQuery = useQuery<BucketObject[]>({
    queryKey: ["bucket-index", bucket],
    queryFn: () => {
      if (!bucket) throw new Error("queryFn called with null bucket");
      return listAllObjects(bucket);
    },
    enabled,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
  });

  const semantic = useSemanticSearch(bucket, query);

  const items: FileItem[] = useMemo(() => {
    if (!indexQuery.data || !debouncedQuery) return [];

    // Build substring candidates (preserving filter rules: hidden files, .r2-storage/).
    const objectsByKey = new Map<string, BucketObject>();
    const substringCandidates: RankerSubstring[] = [];
    for (const obj of indexQuery.data) {
      if (isFolder(obj.key)) continue;
      if (obj.key.startsWith(".r2-storage/")) continue;
      const name = getFileName(obj.key);
      if (!showHiddenFiles && name.startsWith(".")) continue;
      objectsByKey.set(obj.key, obj);
      substringCandidates.push({ key: obj.key, name });
    }

    const semanticCandidates: RankerSemantic[] = semantic.results.map((r) => ({
      key: r.key,
      score: r.score,
    }));

    const merged = mergeResults(substringCandidates, semanticCandidates, debouncedQuery);

    return merged.map((m) => {
      const obj = objectsByKey.get(m.key);
      const semanticHit = semantic.results.find((r) => r.key === m.key);
      const slash = m.key.lastIndexOf("/");
      const location = slash >= 0 ? m.key.slice(0, slash + 1) : "";
      return {
        key: m.key,
        name: obj ? getFileName(obj.key) : (semanticHit?.name ?? getFileName(m.key)),
        isFolder: false,
        size: obj?.size ?? semanticHit?.size ?? 0,
        uploaded: obj?.uploaded ?? semanticHit?.modified ?? new Date(0).toISOString(),
        contentType: obj?.httpMetadata?.contentType ?? semanticHit?.contentType,
        location,
      };
    });
  }, [indexQuery.data, debouncedQuery, showHiddenFiles, semantic.results]);

  return {
    items,
    isLoading: enabled && (indexQuery.isLoading || semantic.isLoading),
    isError: enabled && indexQuery.isError, // semantic error is non-fatal — substring still works
    isEnabled: enabled,
  };
}
