// Shared utilities for workers-pool tests. Imported via setupFiles in vitest.config.mts.
// Keep this file tiny — actual mocks live per-test for clarity.

import { vi, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { applyD1Migrations } from "cloudflare:test";

// Install the test env into the OpenNext cloudflare context symbol so that
// getCloudflareContext() resolves correctly when route handlers are imported
// and called directly (without going through the Next.js request pipeline).
const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
(globalThis as unknown as Record<symbol, unknown>)[cloudflareContextSymbol] = {
  env,
  cf: {},
  ctx: { waitUntil: () => {} },
};

// Apply D1 migrations to the miniflare in-memory DB before any test runs.
// Migrations are parsed at Node-side config time and exposed as env.TEST_MIGRATIONS.
beforeAll(async () => {
  const migrations = (env as unknown as { TEST_MIGRATIONS?: unknown[] })
    .TEST_MIGRATIONS;
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (migrations && db) {
    await applyD1Migrations(
      db,
      migrations as Parameters<typeof applyD1Migrations>[1],
    );
  }
});

// Re-export for convenience. Tests can:  import { env } from "cloudflare:test"
// then override bindings as needed: (env as any).AI = { run: vi.fn(...) }
export { vi };
