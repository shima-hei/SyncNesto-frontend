export type PreviewSource = {
  sectionId: number | null;
  requirementId?: number;
};

export function documentPreviewSourceSearch(
  search: string,
  source?: PreviewSource,
) {
  const params = new URLSearchParams(search);
  params.set("tab", "requirements");
  if (source) {
    if (source.sectionId) params.set("sectionId", String(source.sectionId));
    else params.delete("sectionId");
    if (source.requirementId) {
      params.set("selectedRequirement", String(source.requirementId));
      params.set("reviewTarget", "requirement");
    } else {
      params.delete("selectedRequirement");
      params.set("reviewTarget", "section");
    }
  }
  return params.toString();
}
