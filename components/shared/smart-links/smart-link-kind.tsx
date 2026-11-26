import {
  BookOpenIcon,
  DatabaseIcon,
  FileIcon,
  FileTextIcon,
  FlaskConicalIcon,
  FolderKanbanIcon,
  LayoutTemplateIcon,
  SquareCheckIcon,
  WorkflowIcon,
} from "lucide-react";
import type { SmartLinkRead } from "@/lib/api/generated/model/smartLinkRead";

export function smartLinkKind({
  kind,
  specification_kind,
}: Pick<SmartLinkRead, "kind" | "specification_kind">) {
  switch (kind) {
    case "task":
      return { icon: SquareCheckIcon, label: "タスク" };
    case "requirement":
      return { icon: FileTextIcon, label: "個別要件" };
    case "requirement_document":
      return { icon: BookOpenIcon, label: "要件定義書" };
    case "specification":
      switch (specification_kind) {
        case "api":
          return { icon: WorkflowIcon, label: "API設計" };
        case "screen":
          return { icon: LayoutTemplateIcon, label: "画面設計" };
        case "db":
          return { icon: DatabaseIcon, label: "DB設計" };
        default:
          return { icon: LayoutTemplateIcon, label: "設計" };
      }
    case "test_design":
      return { icon: FlaskConicalIcon, label: "テスト設計" };
    case "test_item":
      return { icon: FlaskConicalIcon, label: "テスト項目" };
    case "test_case":
      return { icon: FlaskConicalIcon, label: "テストケース" };
    case "project":
      return { icon: FolderKanbanIcon, label: "案件" };
    case "document":
    case "document_attachment":
      return { icon: FileIcon, label: "資料" };
  }
}
