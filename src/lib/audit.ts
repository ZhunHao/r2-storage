import type { ActivityAction } from "@/types/activity";

export function extractUserEmail(req: Request): string | null {
  return req.headers.get("Cf-Access-Authenticated-User-Email");
}

export type AuditEnv = { DB: D1Database };

export interface ActivityEvent {
  action: ActivityAction;
  bucket: string;
  objectKey?: string | null;
  metadata?: Record<string, unknown>;
}

export function serializeMetadata(
  m: Record<string, unknown> | undefined,
): string | null {
  return m === undefined ? null : JSON.stringify(m);
}

export async function recordActivity(
  env: AuditEnv,
  req: Request,
  event: ActivityEvent,
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO activity (ts, user_email, action, bucket, object_key, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        new Date().toISOString(),
        extractUserEmail(req),
        event.action,
        event.bucket,
        event.objectKey ?? null,
        serializeMetadata(event.metadata),
      )
      .run();
  } catch (err) {
    console.error("[audit] recordActivity failed", {
      action: event.action,
      bucket: event.bucket,
      key: event.objectKey ?? null,
      err: String(err),
    });
  }
}
