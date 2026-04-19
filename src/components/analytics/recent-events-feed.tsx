/**
 * RecentEventsFeed — presentational list of the most recent activity rows.
 *
 * Pure component: consumes a pre-fetched `ActivityRow[]` from the analytics
 * server loader. Each row is a single compact line showing timestamp, actor,
 * action, bucket, and object key (truncated). System events without an actor
 * are labelled "system" so the row layout stays consistent.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/file-utils";
import type { ActivityRow } from "@/types/activity";

interface RecentEventsFeedProps {
  events: ActivityRow[];
}

export function RecentEventsFeed({ events }: RecentEventsFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Newest events across every bucket
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-2 text-xs leading-5"
              >
                <time
                  dateTime={e.ts}
                  className="shrink-0 text-muted-foreground tabular-nums"
                >
                  {formatDate(e.ts)}
                </time>
                <span className="text-muted-foreground">·</span>
                <span className="truncate text-text-primary">
                  {e.userEmail ?? "system"}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="shrink-0 font-medium text-text-primary">
                  {e.action}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="shrink-0 text-muted-foreground">
                  {e.bucket}
                </span>
                {e.objectKey ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span
                      className="min-w-0 flex-1 truncate text-muted-foreground"
                      title={e.objectKey}
                    >
                      {e.objectKey}
                    </span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
