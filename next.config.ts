import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// Use REAL Cloudflare resources (Vectorize, AI, R2) during `next dev`.
// Per-binding opt-in via `remote: true` in wrangler.jsonc; the option here
// is the global toggle (defaults to true in wrangler 4.36+).
// Docs: https://developers.cloudflare.com/changelog/2025-06-25-getplatformproxy-support-remote-bindings/
initOpenNextCloudflareForDev({ remoteBindings: true });
