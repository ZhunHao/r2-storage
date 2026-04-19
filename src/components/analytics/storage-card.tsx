/**
 * StorageCard — presentational breakdown of object count + bytes per bucket.
 *
 * Pure component: accepts a pre-aggregated `BucketTotal[]` from the analytics
 * server loader. No data fetching, no state. Renders a single shadcn Card with
 * a flat list of bucket rows; friendly labels via `formatBucketName` and
 * human-readable sizes via `formatBytes`.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBucketName, formatBytes } from "@/lib/file-utils";
import type { BucketTotal } from "@/types/analytics";

interface StorageCardProps {
  totals: BucketTotal[];
}

export function StorageCard({ totals }: StorageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>Objects and bytes per bucket</CardDescription>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No buckets discovered
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {totals.map((t) => (
              <li
                key={t.bucket}
                className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                  {formatBucketName(t.bucket)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t.objects.toLocaleString()} objects
                  <span className="mx-2 opacity-50">·</span>
                  {formatBytes(t.bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
