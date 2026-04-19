"use client";

import Papa from "papaparse";
import { useMemo } from "react";
import { usePreviewText } from "@/components/preview/use-preview-text";

interface CsvPreviewProps {
  bucket: string;
  fileKey: string;
}

export function CsvPreview({ bucket, fileKey }: CsvPreviewProps) {
  const { data, isLoading, error } = usePreviewText(bucket, fileKey);

  const parsed = useMemo(() => {
    if (!data) return null;
    const result = Papa.parse<string[]>(data, { skipEmptyLines: true });
    return result.data;
  }, [data]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!parsed || parsed.length === 0) {
    return <div className="text-sm text-muted-foreground">Empty CSV.</div>;
  }

  const [header, ...rows] = parsed;

  return (
    <div className="h-full overflow-auto rounded-sm border bg-background">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="border-b px-3 py-2 text-left font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="even:bg-muted/30">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="border-b px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
