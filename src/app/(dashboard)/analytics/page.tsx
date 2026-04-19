/**
 * Analytics dashboard.
 *
 * Server component: awaits env + runs D1/R2 aggregation directly (no SSR
 * `fetch('/api/analytics')` round-trip under OpenNext). Composes the four
 * presentational pieces — StorageCard, TopFilesTable, DailyChart,
 * RecentEventsFeed — around the single payload returned by
 * `loadAnalyticsData`. On loader failure it falls back to ErrorCard.
 *
 * This page lives under the `(dashboard)` route group so it inherits the
 * sidebar + header layout from `../layout.tsx` while keeping the `/analytics`
 * URL (route groups don't affect URLs).
 */

import { DailyChart } from "@/components/analytics/daily-chart";
import { RecentEventsFeed } from "@/components/analytics/recent-events-feed";
import { StorageCard } from "@/components/analytics/storage-card";
import { TopFilesTable } from "@/components/analytics/top-files-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadAnalyticsData, type AnalyticsData } from "@/lib/analytics-data";
import { getEnv } from "@/lib/r2";

// Route group is a client component; server children still render server-side.
// Avoid any static prerender attempt — this page depends on runtime bindings.
export const dynamic = "force-dynamic";

function ErrorCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics temporarily unavailable</CardTitle>
        <CardDescription>
          We couldn&apos;t load activity or storage data right now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Please refresh in a moment. If this persists, check the D1 binding and
          Worker logs.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  let data: AnalyticsData | null = null;
  try {
    const env = await getEnv();
    data = await loadAnalyticsData(env);
  } catch (err) {
    console.error("[analytics/page] load failed", err);
    data = null;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="px-6 pt-5 pb-4">
        <h1 className="text-[22px] font-semibold text-text-primary">
          Analytics
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Storage totals, activity trends, and recent events across your R2
          buckets.
        </p>
      </div>

      <div className="px-6 pb-6">
        {data === null ? (
          <ErrorCard />
        ) : data.recent.length === 0 &&
          data.daily.length === 0 &&
          data.topFiles.length === 0 ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>No activity yet</CardTitle>
                <CardDescription>
                  Upload a file, share a link, or perform any action to start
                  populating analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This page refreshes on every visit — come back after any
                  action.
                </p>
              </CardContent>
            </Card>
            <StorageCard totals={data.totalsByBucket} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StorageCard totals={data.totalsByBucket} />
              <RecentEventsFeed events={data.recent} />
            </div>
            <DailyChart data={data.daily} />
            <TopFilesTable files={data.topFiles} />
          </div>
        )}
      </div>
    </div>
  );
}
