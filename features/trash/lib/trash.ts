import type { TrashItem } from "@/lib/api/generated/model";

export const TRASH_LABELS = {
  requirement_document: "要件定義書",
  requirement_section: "セクション",
  requirement: "要件",
  task: "タスク",
  test_design: "テスト設計書",
  document: "ドキュメント",
  document_attachment: "文書添付",
} as const;

export const restoredHref = (projectId: number, item: TrashItem) => {
  const base = `/projects/joined/${projectId}`;
  switch (item.kind) {
    case "requirement_document":
      return `${base}/requirements/${item.id}`;
    case "requirement_section":
      return item.container_id
        ? `${base}/requirements/${item.container_id}`
        : null;
    case "requirement":
      return item.container_id
        ? `${base}/requirements/${item.container_id}/items/${item.id}`
        : null;
    case "task":
      return `${base}/tasks/${item.id}`;
    case "test_design":
      return `${base}/test-designs/${item.id}`;
    case "document":
      return `${base}/documents/${item.id}`;
    case "document_attachment":
      return item.container_id
        ? `${base}/documents/${item.container_id}`
        : null;
  }
};
