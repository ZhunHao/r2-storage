"use client";

import { fetchServerConfig } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetchServerConfig().then((config) => {
      if (config.buckets.length > 0) {
        router.replace(`/${config.buckets[0].name}`);
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading buckets...</div>
    </div>
  );
}
