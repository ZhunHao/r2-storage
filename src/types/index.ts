// R2 Object representation returned by API
export interface R2ObjectInfo {
  key: string;
  size: number;
  uploaded: string;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: string;
}

// API response for listing objects
export interface ListObjectsResponse {
  objects: R2ObjectInfo[];
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
}

// Bucket info from server config
export interface BucketInfo {
  name: string;
}

// Server config response
export interface ServerConfig {
  buckets: BucketInfo[];
  readonly: boolean;
  auth?: {
    type: string;
    username: string;
  };
}

// Share link metadata
export interface ShareMetadata {
  id: string;
  bucket: string;
  key: string;
  expiresAt?: number;
  maxDownloads?: number;
  currentDownloads: number;
  createdBy: string;
  createdAt: number;
}

// File item for UI (unified folder + file)
export interface FileItem {
  key: string;
  name: string;
  isFolder: boolean;
  size: number;
  uploaded: string;
  contentType?: string;
  location?: string; // parent folder path (for search results), e.g. "photos/2024/"
}

// Upload state
export interface UploadFile {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
}

// View mode
export type ViewMode = "grid" | "list";

// Sort field
export type SortField = "name" | "kind" | "size" | "date";

export interface SemanticSearchResult {
  key: string;
  name: string;
  folderPath: string;
  size: number;
  contentType?: string;
  modified: string;
  score: number;
}

export interface SemanticSearchResponse {
  success: true;
  results: SemanticSearchResult[];
  query: string;
  count: number;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ChatErrorCode =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "AI_UPSTREAM"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INVALID_REQUEST";

export interface ContextRef {
  offset: number;
  length: number;
  preview: string;
}

export type ChatEvent =
  | { type: "delta"; content: string }
  | { type: "context"; chunks: ContextRef[] }
  | { type: "done" }
  | { type: "error"; message: string; code: ChatErrorCode };
