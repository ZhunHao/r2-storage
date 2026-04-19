/**
 * TopFilesTable — presentational table of the most-touched objects.
 *
 * Pure component: consumes a pre-aggregated `TopFile[]` from the analytics
 * server loader. Renders a shadcn Table inside a Card with bucket, filename,
 * touch count, and last-activity timestamp columns. The full R2 object key
 * becomes the row's `title` so hovering reveals the path beyond the basename.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBucketName, formatDate, getFileName } from "@/lib/file-utils";
import type { TopFile } from "@/types/analytics";

interface TopFilesTableProps {
  files: TopFile[];
}

export function TopFilesTable({ files }: TopFilesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most touched files</CardTitle>
        <CardDescription>
          Top activity across all buckets, last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No file activity yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead>File</TableHead>
                <TableHead className="text-right">Touches</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow key={`${f.bucket}:${f.objectKey}`}>
                  <TableCell className="text-muted-foreground">
                    {formatBucketName(f.bucket)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span
                      className="block max-w-[280px] truncate"
                      title={f.objectKey}
                    >
                      {getFileName(f.objectKey)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <time dateTime={f.lastTs}>{formatDate(f.lastTs)}</time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
