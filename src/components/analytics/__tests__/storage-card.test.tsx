import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { StorageCard } from "@/components/analytics/storage-card";
import type { BucketTotal } from "@/types/analytics";

describe("StorageCard", () => {
  it("renders a row per bucket with formatted name and size", () => {
    const totals: BucketTotal[] = [
      { bucket: "WEBSITE_ASSETS", objects: 12, bytes: 2048 },
      { bucket: "EXPLORER_TEST", objects: 3, bytes: 0 },
    ];
    const html = renderToString(<StorageCard totals={totals} />);
    expect(html).toContain("Website Assets");
    expect(html).toContain("Explorer Test");
    expect(html).toContain("2 KB");
    expect(html).toContain("12");
  });

  it("renders empty state when no buckets", () => {
    const html = renderToString(<StorageCard totals={[]} />);
    expect(html).toContain("No buckets discovered");
  });
});
