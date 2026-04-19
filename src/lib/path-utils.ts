export function basename(key: string): string {
  if (!key) return "";
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

export function dirname(key: string): string {
  if (!key) return "";
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? "" : trimmed.slice(0, slash + 1);
}
