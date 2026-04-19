/* eslint-disable no-console */
const bucket = process.argv[2];
const baseUrl = process.env.REINDEX_URL ?? "http://localhost:3000";

if (!bucket) {
  console.error("usage: pnpm tsx scripts/reindex-bucket.ts <BUCKET_BINDING>");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/admin/${bucket}/reindex`, { method: "POST" });
if (!res.ok) {
  console.error(`reindex failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(await res.json());
