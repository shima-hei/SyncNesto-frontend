import type { SmartLinkReference } from "@/lib/api/generated/model/smartLinkReference";

const projectPath = /^\/projects\/joined\/([1-9]\d*)(?:\/(.*?))?\/?$/;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const untrusted = /[\\\s\p{Cc}]/u;
const pathKinds = {
  tasks: "task",
  requirements: "requirement_document",
  specifications: "specification",
  "test-designs": "test_design",
  documents: "document",
} as const;

const wholeId = (value: string | undefined) =>
  value && /^[1-9]\d*$/.test(value) && +value <= 2147483647
    ? Number(value)
    : undefined;

export function allowedSmartLinkOrigins(currentOrigin: string): string[] {
  // Both addresses point to the same live database during the temporary Mac operation.
  const liveOrigins = ["https://syncnesto.vercel.app", "http://localhost:3100"];
  const configured = (process.env.NEXT_PUBLIC_SMART_LINK_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [
    currentOrigin,
    ...(liveOrigins.includes(currentOrigin) ? liveOrigins : []),
    ...configured,
  ];
}

export type ParsedSmartLink = {
  reference: SmartLinkReference;
  tenantId?: number;
  localHref: string;
};

export function parseSmartLink(
  href: string,
  currentOrigin: string,
  origins = allowedSmartLinkOrigins(currentOrigin),
): ParsedSmartLink | null {
  if (!href || untrusted.test(href) || href.startsWith("//")) return null;
  if (!href.startsWith("/") && !/^https?:\/\//i.test(href)) return null;
  const rawPath = href.split(/[?#]/, 1)[0];
  if (/%|(?:^|\/)\.{1,2}(?:\/|$)/.test(rawPath)) return null;

  let url: URL;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return null;
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !origins.includes(url.origin)
  ) {
    return null;
  }

  const match = projectPath.exec(url.pathname);
  const projectId = wholeId(match?.[1]);
  if (!projectId) return null;

  const tenants = url.searchParams.getAll("tenant");
  const tenantId = wholeId(tenants[0]);
  if (tenants.length > 1 || (tenants.length && !tenantId)) return null;
  const result = (
    kind: SmartLinkReference["kind"],
    id: string,
    container_id?: number,
  ): ParsedSmartLink => ({
    reference: { kind, id, project_id: projectId, container_id },
    tenantId,
    localHref: url.pathname + url.search + url.hash,
  });

  const parts = match?.[2]?.split("/") ?? [];
  if (!parts.length) return result("project", String(projectId));
  const [section, id, childSection, childId] = parts;
  if (
    parts.length === 4 &&
    section === "requirements" &&
    childSection === "items"
  ) {
    const parent = wholeId(id);
    return parent && wholeId(childId)
      ? result("requirement", childId, parent)
      : null;
  }
  if (section === "test-cases" && parts.length === 1) {
    const cases = url.searchParams.getAll("case");
    const designs = url.searchParams.getAll("design");
    const designId = wholeId(designs[0]);
    return cases.length === 1 &&
      uuid.test(cases[0]) &&
      designs.length === 1 &&
      designId
      ? result("test_case", cases[0].toLowerCase(), designId)
      : null;
  }
  if (parts.length !== 2 || !wholeId(id)) return null;
  if (section === "test-designs") {
    const items = url.searchParams.getAll("item");
    if (items.length) {
      return items.length === 1 && uuid.test(items[0])
        ? result("test_item", items[0].toLowerCase(), Number(id))
        : null;
    }
  }
  if (section === "documents" && url.hash.startsWith("#attachment-")) {
    const attachment = url.hash.slice("#attachment-".length);
    return uuid.test(attachment)
      ? result("document_attachment", attachment.toLowerCase(), Number(id))
      : null;
  }
  const kind = Object.hasOwn(pathKinds, section)
    ? pathKinds[section as keyof typeof pathKinds]
    : null;
  return kind ? result(kind, id) : null;
}

export function smartLinkPath(reference: SmartLinkReference): string {
  const base = `/projects/joined/${reference.project_id}`;
  const id = encodeURIComponent(reference.id);
  switch (reference.kind) {
    case "project":
      return base;
    case "requirement_document":
      return `${base}/requirements/${id}`;
    case "requirement":
      return `${base}/requirements/${reference.container_id}/items/${id}`;
    case "task":
      return `${base}/tasks/${id}`;
    case "document":
      return `${base}/documents/${id}`;
    case "document_attachment":
      return `${base}/documents/${reference.container_id}?tab=attachments#attachment-${id}`;
    case "specification":
      return `${base}/specifications/${id}`;
    case "test_design":
      return `${base}/test-designs/${id}`;
    case "test_item":
      return `${base}/test-designs/${reference.container_id}?item=${id}`;
    case "test_case":
      return `${base}/test-cases?design=${reference.container_id}&case=${id}`;
  }
}

export function smartLinkKey(reference: SmartLinkReference): string {
  return JSON.stringify([
    reference.kind,
    reference.project_id,
    reference.container_id ?? null,
    reference.id,
  ]);
}
