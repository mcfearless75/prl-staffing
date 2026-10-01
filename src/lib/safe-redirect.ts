/**
 * A redirect target from a query string, kept on this site. Anything that is
 * not a plain path ("https://…", "//host", "/\host") would make the redirect
 * an open redirect, so it falls back instead.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
