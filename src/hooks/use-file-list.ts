"use client";

import { listObjects } from "@/lib/api-client";
import { getFileKind, getFileName, isFolder } from "@/lib/file-utils";
import { useAppStore } from "@/stores/app-store";
import type { FileItem, SortField } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function buildComparator(field: SortField, direction: "asc" | "desc") {
  const dir = direction === "asc" ? 1 : -1;
  return (a: FileItem, b: FileItem): number => {
    switch (field) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "kind":
        return dir * getFileKind(a.key).localeCompare(getFileKind(b.key));
      case "size":
        return dir * (a.size - b.size);
      case "date": {
        const ta = a.uploaded ? new Date(a.uploaded).getTime() : 0;
        const tb = b.uploaded ? new Date(b.uploaded).getTime() : 0;
        return dir * (ta - tb);
      }
      default:
        return 0;
    }
  };
}

export function useFileList(bucket: string | null, prefix: string) {
  const query = useInfiniteQuery({
    queryKey: ["files", bucket, prefix],
    queryFn: ({ pageParam }) =>
      listObjects(bucket!, prefix, pageParam as string | undefined),
    getNextPageParam: (lastPage) =>
      lastPage.truncated ? lastPage.cursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!bucket,
  });

  const { sortField, sortDirection } = useAppStore();

  const items: FileItem[] = useMemo(() => {
    if (!query.data) return [];

    const folders: FileItem[] = [];
    const files: FileItem[] = [];

    // Collect folders from delimitedPrefixes
    for (const page of query.data.pages) {
      for (const folderPrefix of page.delimitedPrefixes) {
        folders.push({
          key: folderPrefix,
          name: getFileName(folderPrefix),
          isFolder: true,
          size: 0,
          uploaded: "",
        });
      }

      // Collect files (exclude folder markers)
      for (const obj of page.objects) {
        if (!isFolder(obj.key)) {
          files.push({
            key: obj.key,
            name: getFileName(obj.key),
            isFolder: false,
            size: obj.size,
            uploaded: obj.uploaded,
            contentType: obj.httpMetadata?.contentType,
          });
        }
      }
    }

    const comparator = buildComparator(sortField, sortDirection);
    folders.sort(comparator);
    files.sort(comparator);

    return [...folders, ...files];
  }, [query.data, sortField, sortDirection]);

  return { ...query, items };
}
