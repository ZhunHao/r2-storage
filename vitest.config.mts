import { defineConfig, defineProject } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "src") };

// Read D1 migrations at Node-side config time. The workers pool exposes the
// parsed migrations to tests via `env.TEST_MIGRATIONS`, and we apply them in
// src/test/setup.ts before each test suite runs.
const migrations = await readD1Migrations(path.resolve(__dirname, "migrations"));

export default defineConfig({
  test: {
    projects: [
      // 1) Pure-function tests — fast, plain Node.
      defineProject({
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx"],
          exclude: ["src/**/__tests__/**/*.workers.test.ts"],
          globals: false,
        },
        resolve: { alias },
      }),
      // 2) Route-handler tests — real Workers runtime, real bindings (mocked AI/Vectorize).
      defineProject({
        plugins: [
          cloudflareTest({
            // Minimal entry point — tests import route handlers directly.
            main: "./src/test/worker-entry.ts",
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              // Compatibility flags must match the deployed worker.
              compatibilityFlags: ["nodejs_compat"],
              // Override the DB binding to a local in-memory D1 for tests.
              // wrangler.jsonc declares `remote: true` so the prod Worker talks
              // to the real D1; tests must stay local so migrations and inserts
              // don't hit the remote database.
              d1Databases: { DB: "test-activity" },
              // In-memory KV namespace backing the listing cache. wrangler.jsonc
              // declares `remote: true`, so tests must provide a local binding.
              kvNamespaces: ["LISTINGS_KV"],
              // Expose the parsed D1 migrations to tests so setup.ts can apply
              // them against the in-memory miniflare D1 before each file runs.
              bindings: { TEST_MIGRATIONS: migrations },
            },
          }),
        ],
        test: {
          name: "workers",
          include: ["src/**/__tests__/**/*.workers.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
        resolve: { alias },
      }),
    ],
  },
});
