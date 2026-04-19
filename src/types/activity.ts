export type ActivityAction =
  | "upload" | "delete" | "move" | "copy"
  | "folder-create" | "share-create" | "share-revoke";

export interface ActivityRow {
  id: number;
  ts: string;              // ISO-8601
  userEmail: string | null;
  action: ActivityAction;
  bucket: string;
  objectKey: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ActivityListResponse {
  success: true;
  rows: ActivityRow[];
  nextCursor: string | null; // opaque; encode last (ts,id) pair
}
