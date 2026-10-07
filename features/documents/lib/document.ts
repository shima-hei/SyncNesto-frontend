import type { DocumentLinkTarget } from "@/lib/api/generated/model/documentLinkTarget";

export const documentKeys = {
  all: (projectId: number) => ["documents", projectId] as const,
  detail: (projectId: number, documentId: number) =>
    ["documents", projectId, "detail", documentId] as const,
};

export const documentsHref = (projectId: number, documentId?: number) =>
  `/projects/joined/${projectId}/documents${documentId ? `/${documentId}` : ""}`;

export const DOCUMENT_TARGET_LABELS = {
  requirement: "要件",
  task: "タスク",
  test_design: "テスト設計書",
} as const;

export const documentTargetHref = (
  projectId: number,
  target: DocumentLinkTarget,
) => {
  const base = `/projects/joined/${projectId}`;
  switch (target.target_type) {
    case "requirement":
      return target.requirement_document_id
        ? `${base}/requirements/${target.requirement_document_id}/items/${target.target_id}`
        : null;
    case "task":
      return `${base}/tasks/${target.target_id}`;
    case "test_design":
      return `${base}/test-designs/${target.target_id}`;
  }
};

export type DocumentValues = { title: string; body: string };

export const mergeDocumentValues = (
  original: DocumentValues,
  local: DocumentValues,
  current: DocumentValues,
): DocumentValues => ({
  title: local.title === original.title ? current.title : local.title,
  body: local.body === original.body ? current.body : local.body,
});

export const DOCUMENT_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/plain",
  csv: "text/plain",
  json: "application/json",
};

export const DOCUMENT_FILE_ACCEPT = Object.keys(DOCUMENT_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");
