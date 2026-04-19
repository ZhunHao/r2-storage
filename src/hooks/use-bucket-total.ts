"use client";

import { fetchBucketTotal } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

// Recursive object/byte counts for a whole bucket. Used to label the bucket
// root header (`/[bucket]` with no prefix). Server-side route caches for 60s,
// so a few seconds of staleness here is fine — keep it cheap.
export function useBucketTotal(bucket: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["bucket-total", bucket],
    queryFn: () => fetchBucketTotal(bucket!),
    enabled: !!bucket && enabled,
    staleTime: 30_000,
  });
}
