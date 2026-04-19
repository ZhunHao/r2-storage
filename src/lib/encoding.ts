/**
 * Base64 encode/decode for R2 object keys.
 * Handles UTF-8 filenames correctly.
 * Pattern from: r2-template/packages/dashboard/src/appUtils.js
 */

export function encodeKey(key: string): string {
  return btoa(unescape(encodeURIComponent(key)));
}

export function decodeKey(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)));
}
