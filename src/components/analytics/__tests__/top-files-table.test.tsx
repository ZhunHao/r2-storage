import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TopFilesTable } from "@/components/analytics/top-files-table";
import type { TopFile } from "@/types/analytics";

describe("TopFilesTable", () => {
  it("renders one row per file with bucket, basename, and count", () => {
    const files: TopFile[] = [
      {
        bucket: "WEBSITE_ASSETS",
        objectKey: "images/hero/banner.png",
        count: 42,
        lastTs: "2026-04-18T10:00:00.000Z",
      },
      {
        bucket: "EXPLORER_TEST",
        objectKey: "reports/2026-q1.csv",
        count: 7,
        lastTs: "2026-04-17T09:00:00.000Z",
      },
    ];
    const html = renderToString(<TopFilesTable files={files} />);
    expect(html).toContain("Website Assets");
    expect(html).toContain("banner.png");
    expect(html).toContain("2026-q1.csv");
    expect(html).toContain("42");
    // Full key exposed via title attribute for truncated cells.
    expect(html).toContain("images/hero/banner.png");
    // Last-activity timestamp rendered via SSR-safe formatDate (pinned locale).
    // Assert on year only — stable across server TZ / CI locale.
    expect(html).toContain("2026");
    expect(html).toContain('<time dateTime="2026-04-18T10:00:00.000Z"');
  });

  it("renders empty state when no files", () => {
    const html = renderToString(<TopFilesTable files={[]} />);
    expect(html).toContain("No file activity yet");
  });
});
