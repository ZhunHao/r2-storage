import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/r2";
import type { ActivityRow } from "@/types/activity";

const QuerySchema = z.object({
  bucket: z.string().optional(),
  action: z.string().optional(),
  user: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

function decodeCursor(c?: string): { ts: string; id: number } | null {
  if (!c) return null;
  try {
    const decoded = Buffer.from(c, "base64url").toString("utf8");
    const pipeIdx = decoded.lastIndexOf("|");
    if (pipeIdx === -1) return null;
    const ts = decoded.slice(0, pipeIdx);
    const id = Number(decoded.slice(pipeIdx + 1));
    if (!ts || !Number.isInteger(id) || id < 1) return null;
    return { ts, id };
  } catch {
    return null;
  }
}

function encodeCursor(ts: string, id: number): string {
  return Buffer.from(`${ts}|${id}`, "utf8").toString("base64url");
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parse = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parse.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const q = parse.data;
  const env = (await getEnv()) as unknown as { DB: D1Database };

  const conds: string[] = [];
  const params: unknown[] = [];
  if (q.bucket) {
    conds.push("bucket = ?");
    params.push(q.bucket);
  }
  if (q.action) {
    conds.push("action = ?");
    params.push(q.action);
  }
  if (q.user) {
    conds.push("user_email = ?");
    params.push(q.user);
  }
  if (q.from) {
    conds.push("ts >= ?");
    params.push(q.from);
  }
  if (q.to) {
    conds.push("ts <= ?");
    params.push(q.to);
  }
  if (q.cursor) {
    const cur = decodeCursor(q.cursor);
    if (!cur) {
      return NextResponse.json({ error: "invalid cursor" }, { status: 400 });
    }
    conds.push("(ts, id) < (?, ?)");
    params.push(cur.ts, cur.id);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const sql = `SELECT id, ts, user_email, action, bucket, object_key, metadata
                 FROM activity ${where}
                ORDER BY ts DESC, id DESC
                LIMIT ?`;
  params.push(q.limit + 1);

  const { results } = await env.DB.prepare(sql)
    .bind(...params)
    .all<{
      id: number;
      ts: string;
      user_email: string | null;
      action: string;
      bucket: string;
      object_key: string | null;
      metadata: string | null;
    }>();

  const hasMore = results.length > q.limit;
  const page = hasMore ? results.slice(0, q.limit) : results;

  const rows: ActivityRow[] = page.map((r) => ({
    id: r.id,
    ts: r.ts,
    userEmail: r.user_email,
    action: r.action as ActivityRow["action"],
    bucket: r.bucket,
    objectKey: r.object_key,
    metadata: (() => {
      if (!r.metadata) return null;
      try {
        return JSON.parse(r.metadata) as Record<string, unknown>;
      } catch {
        return null;
      }
    })(),
  }));

  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.ts, last.id) : null;

  return NextResponse.json({ success: true, rows, nextCursor });
}
