import type { ActivityRow } from "./activity";

export interface BucketTotal {
  bucket: string;
  objects: number;
  bytes: number;
}

export interface TopFile {
  bucket: string;
  objectKey: string;
  count: number;
  lastTs: string;
}

export interface DailyPoint {
  day: string;
  action: string;
  count: number;
}

export interface AnalyticsResponse {
  success: true;
  totalsByBucket: BucketTotal[];
  topFiles: TopFile[];
  daily: DailyPoint[];
  recent: ActivityRow[];
}
