export type ArtifactKind =
  "requirement" | "requirement_document" | "specification";

export function safeArtifactOrigin(
  candidate: string | null,
  projectId: number,
) {
  const fallback = `/projects/joined/${projectId}/requirements`;
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate, "https://syncnesto.invalid");
    if (url.origin !== "https://syncnesto.invalid") return fallback;
    const pattern = new RegExp(
      `^/projects/joined/${projectId}/(?:requirements/\\d+(?:/items/\\d+)?|specifications/\\d+)$`,
    );
    return pattern.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function artifactReleasesHref(
  projectId: number,
  kind: ArtifactKind,
  id: number,
  version: number,
  from: string,
) {
  const query = new URLSearchParams({
    kind,
    sourceId: String(id),
    version: String(version),
    from,
  });
  return `/projects/joined/${projectId}/artifact-releases?${query}`;
}
