"use client";

import { searchSemantic } from "@/lib/api-client";
import type { SemanticSearchResult } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "./use-debounced-value";

const DEBOUNCE_MS = 250;
const STALE_MS = 60_000;
const MIN_QUERY_LEN = 2;

export interface UseSemanticSearchResult {
  results: SemanticSearchResult[];
  isLoading: boolean;
  isError: boolean;
  isEnabled: boolean;
}

export function useSemanticSearch(
  bucket: string | null,
  query: string
): UseSemanticSearchResult {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const enabled = !!bucket && debounced.length >= MIN_QUERY_LEN;

  const q = useQuery({
    queryKey: ["semantic-search", bucket, debounced],
    queryFn: () => {
      if (!bucket) throw new Error("queryFn called with null bucket");
      return searchSemantic(bucket, debounced);
    },
    enabled,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    retry: 1,
  });

  return {
    results: q.data?.results ?? [],
    isLoading: enabled && q.isLoading,
    isError: enabled && q.isError,
    isEnabled: enabled,
  };
}
