/**
 * File utility helpers for the UI.
 */

/**
 * Format a binding name (e.g. "WEBSITE_ASSETS") to Title Case ("Website Assets").
 */
export function formatBucketName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format date to relative time string.
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

/**
 * Format date to iCloud-style display: "4/9/2026, 4:40 PM"
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get a human-readable file kind from extension/content type.
 */
export function getFileKind(key: string): string {
  const ext = getExtension(key);
  const kinds: Record<string, string> = {
    pdf: "PDF document",
    doc: "Microsoft Word document",
    docx: "Microsoft Word document",
    xls: "Microsoft Excel spreadsheet",
    xlsx: "Office Open XML spreadsheet",
    ppt: "Microsoft PowerPoint",
    pptx: "Microsoft PowerPoint",
    txt: "Plain text",
    md: "Markdown document",
    csv: "CSV document",
    json: "JSON file",
    xml: "XML document",
    html: "HTML document",
    css: "CSS stylesheet",
    js: "JavaScript file",
    ts: "TypeScript file",
    jsx: "JSX file",
    tsx: "TSX file",
    py: "Python script",
    rs: "Rust source",
    go: "Go source",
    sh: "Shell script",
    png: "PNG image",
    jpg: "JPEG image",
    jpeg: "JPEG image",
    gif: "GIF image",
    webp: "WebP image",
    svg: "SVG image",
    avif: "AVIF image",
    ico: "Icon file",
    bmp: "Bitmap image",
    mp4: "MPEG-4 video",
    webm: "WebM video",
    mov: "QuickTime movie",
    ogg: "Ogg audio",
    mp3: "MP3 audio",
    wav: "WAV audio",
    flac: "FLAC audio",
    aac: "AAC audio",
    zip: "ZIP archive",
    tar: "TAR archive",
    gz: "Gzip archive",
    rar: "RAR archive",
    "7z": "7-Zip archive",
    yaml: "YAML document",
    yml: "YAML document",
    toml: "TOML document",
    env: "Environment file",
    log: "Log file",
  };
  return kinds[ext] ?? (ext ? `${ext.toUpperCase()} file` : "Document");
}

/**
 * Get file extension from a key/filename.
 */
export function getExtension(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Get the filename from a full key path.
 */
export function getFileName(key: string): string {
  const parts = key.replace(/\/$/, "").split("/");
  return parts[parts.length - 1];
}

/**
 * Get the MIME category for file preview routing.
 */
export type MimeCategory =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "code"
  | "unknown";

const MIME_MAP: Record<string, MimeCategory> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  avif: "image",
  ico: "image",
  bmp: "image",
  mp4: "video",
  webm: "video",
  ogg: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  aac: "audio",
  pdf: "pdf",
  txt: "text",
  log: "text",
  md: "text",
  csv: "text",
  json: "code",
  xml: "code",
  yaml: "code",
  yml: "code",
  html: "code",
  css: "code",
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  py: "code",
  rs: "code",
  go: "code",
  sh: "code",
  toml: "code",
  env: "code",
};

export function getMimeCategory(key: string): MimeCategory {
  const ext = getExtension(key);
  return MIME_MAP[ext] ?? "unknown";
}

/**
 * Check if a key represents a folder (trailing slash).
 */
export function isFolder(key: string): boolean {
  return key.endsWith("/");
}

/**
 * Content type to use for upload based on extension.
 */
const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
};

export function getContentType(filename: string): string {
  const ext = getExtension(filename);
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export type PreviewKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "markdown"
  | "csv"
  | "json"
  | "html"
  | "code"
  | "gzip-log"
  | "unsupported";

const PREVIEW_KIND_MAP: Record<string, PreviewKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  svg: "image", avif: "image", ico: "image", bmp: "image",
  mp4: "video", webm: "video", mov: "video",
  ogg: "audio", mp3: "audio", wav: "audio", flac: "audio", aac: "audio",
  pdf: "pdf",
  md: "markdown", markdown: "markdown",
  csv: "csv",
  json: "json",
  html: "html", htm: "html",
  txt: "code", log: "code", xml: "code", yaml: "code", yml: "code",
  css: "code", js: "code", ts: "code", jsx: "code", tsx: "code",
  py: "code", rs: "code", go: "code", sh: "code", toml: "code", env: "code",
};

/**
 * Return the preview component kind for a given object key.
 * Falls back to "unsupported" for binaries or unknown extensions.
 */
export function getPreviewKind(key: string): PreviewKind {
  if (isFolder(key)) return "unsupported";
  const name = getFileName(key).toLowerCase();
  // Special case: .log.gz or .gz (assume gzipped text log)
  if (name.endsWith(".log.gz") || name.endsWith(".gz")) return "gzip-log";
  const ext = getExtension(key);
  return PREVIEW_KIND_MAP[ext] ?? "unsupported";
}

/**
 * Build the streaming object URL for a bucket+key. Used as `src` for
 * <img>, <video>, <audio>, and <iframe> preview components.
 */
export function getObjectUrl(bucket: string, key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `/api/buckets/${bucket}/object/${encoded}`;
}
