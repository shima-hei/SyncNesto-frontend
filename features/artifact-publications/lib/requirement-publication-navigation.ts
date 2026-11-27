export function requirementPublicationHref(
  projectId: number,
  documentId: number,
  version: number,
  item?: { id: number; code: string; version: number },
) {
  const query = new URLSearchParams({
    document: String(documentId),
    version: String(version),
  });
  if (item) {
    query.set("item", String(item.id));
    query.set("itemCode", item.code);
    query.set("itemVersion", String(item.version));
  }
  return `/projects/joined/${projectId}/artifact-publications?${query}`;
}
