import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { RecentEventsFeed } from "@/components/analytics/recent-events-feed";
import type { ActivityRow } from "@/types/activity";

describe("RecentEventsFeed", () => {
  it("renders action, actor, bucket, and key per event", () => {
    const events: ActivityRow[] = [
      {
        id: 1,
        ts: "2026-04-18T10:00:00.000Z",
        userEmail: "alice@example.com",
        action: "upload",
        bucket: "WEBSITE_ASSETS",
        objectKey: "docs/readme.md",
        metadata: null,
      },
      {
        id: 2,
        ts: "2026-04-18T09:59:00.000Z",
        userEmail: null,
        action: "delete",
        bucket: "EXPLORER_TEST",
        objectKey: null,
        metadata: null,
      },
    ];
    const html = renderToString(<RecentEventsFeed events={events} />);
    expect(html).toContain("alice@example.com");
    expect(html).toContain("upload");
    expect(html).toContain("docs/readme.md");
    // Null userEmail surfaces as "system" so row shape is stable.
    expect(html).toContain("system");
    expect(html).toContain("delete");
    // Timestamp rendered via SSR-safe formatDate (pinned locale).
    // Assert on year only — stable across server TZ / CI locale.
    expect(html).toContain("2026");
    expect(html).toContain('<time dateTime="2026-04-18T10:00:00.000Z"');
  });

  it("renders empty state when no events", () => {
    const html = renderToString(<RecentEventsFeed events={[]} />);
    expect(html).toContain("No recent activity");
  });
});
