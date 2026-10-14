export function safeListReturn(
  candidate: string | null,
  fallback: string,
): string {
  if (!candidate) return fallback;
  try {
    const base = new URL(fallback, "https://syncnesto.invalid");
    const url = new URL(candidate, "https://syncnesto.invalid");
    if (url.origin !== base.origin || url.pathname !== base.pathname)
      return fallback;
    url.searchParams.delete("returnTo");
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function withListReturn(href: string, returnTo: string): string {
  const url = new URL(href, "https://syncnesto.invalid");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}${url.hash}`;
}
