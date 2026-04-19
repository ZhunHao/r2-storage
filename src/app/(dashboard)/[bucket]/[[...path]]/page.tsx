"use client";

import { FileBrowser } from "@/components/files/file-browser";
import { useAppStore } from "@/stores/app-store";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { use } from "react";

export default function BucketPage() {
  const params = useParams();
  const bucket = params.bucket as string;
  const pathSegments = (params.path as string[] | undefined) ?? [];
  const prefix = pathSegments.length > 0 ? `${pathSegments.join("/")}/` : "";

  const { setSelectedBucket } = useAppStore();

  useEffect(() => {
    setSelectedBucket(bucket);
  }, [bucket, setSelectedBucket]);

  return <FileBrowser bucket={bucket} prefix={prefix} />;
}
