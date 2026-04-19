"use client";

import { fetchObjectText } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

export function usePreviewText(bucket: string, key: string, enabled = true) {
  return useQuery({
    queryKey: ["preview-text", bucket, key],
    queryFn: () => fetchObjectText(bucket, key),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
