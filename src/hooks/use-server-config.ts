"use client";

import { fetchServerConfig } from "@/lib/api-client";
import { useAppStore } from "@/stores/app-store";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useServerConfig() {
  const { setBuckets, setReadonly } = useAppStore();

  const query = useQuery({
    queryKey: ["server-config"],
    queryFn: fetchServerConfig,
  });

  useEffect(() => {
    if (query.data) {
      setBuckets(query.data.buckets);
      setReadonly(query.data.readonly);
    }
  }, [query.data, setBuckets, setReadonly]);

  return query;
}
