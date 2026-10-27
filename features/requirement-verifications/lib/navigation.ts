export function safeVerificationOrigin(
  candidate: string | null,
  projectId: number,
): string {
  const fallback = `/projects/joined/${projectId}`;
  if (
    !candidate ||
    candidate.length > 4096 ||
    /[\u0000-\u001f\\]/.test(candidate)
  )
    return fallback;
  try {
    const url = new URL(candidate, "https://syncnesto.invalid");
    const prefix = `/projects/joined/${projectId}`;
    if (
      url.origin !== "https://syncnesto.invalid" ||
      url.username ||
      url.password
    )
      return fallback;
    if (
      url.pathname !== prefix &&
      !new RegExp(
        `^${prefix}/requirements/[1-9]\\d*(?:/items/[1-9]\\d*)?$`,
      ).test(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function verificationHref(
  projectId: number,
  planId: string,
  from: string,
) {
  const params = new URLSearchParams({
    from: safeVerificationOrigin(from, projectId),
  });
  return `/projects/joined/${projectId}/requirement-verifications/${planId}?${params}`;
}

export function quoteOffset(text: string, quote: string): number | null {
  if (!quote) return null;
  const offset = text.indexOf(quote);
  return offset < 0 ? null : Array.from(text.slice(0, offset)).length;
}
