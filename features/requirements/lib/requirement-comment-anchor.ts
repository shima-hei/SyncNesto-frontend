import type {
  RequirementDetailRead,
  RequirementLinkRead,
  RequirementRelationRead,
} from "@/lib/api/generated/model";

import {
  getRequirementDetailTitle,
  getRequirementDetailTypeLabel,
} from "./requirement-detail-metadata";
import { getRequirementRelationTypeLabel } from "../constants/requirement-options";

export type RequirementCommentAnchor =
  | {
      kind: "requirement_field";
      field: string;
      label: string;
    }
  | {
      kind: "requirement_detail";
      detail_id: number;
      detail_type: string;
      label: string;
    }
  | {
      kind: "requirement_link";
      link_id: number;
      label: string;
    }
  | {
      kind: "requirement_relation";
      relation_id: number;
      label: string;
    }
  | {
      kind: "requirement_task";
      task_id: number;
      relation_id?: number;
      label: string;
    };

export const createRequirementFieldCommentAnchor = (
  field: string,
  label: string,
): RequirementCommentAnchor => ({
  kind: "requirement_field",
  field,
  label,
});

export const createRequirementDetailCommentAnchor = (
  detail: RequirementDetailRead,
): RequirementCommentAnchor => ({
  kind: "requirement_detail",
  detail_id: detail.id,
  detail_type: detail.detail_type,
  label: `実現内容: ${getRequirementDetailTitle(detail)}`,
});

export const createRequirementLinkCommentAnchor = (
  link: RequirementLinkRead,
): RequirementCommentAnchor => ({
  kind: "requirement_link",
  link_id: link.id,
  label: `関連成果物: ${link.linked_id}`,
});

export const createRequirementRelationCommentAnchor = (
  relation: RequirementRelationRead,
): RequirementCommentAnchor => ({
  kind: "requirement_relation",
  relation_id: relation.id,
  label: `要件関連: ${getRequirementRelationTypeLabel(
    relation.relation_type,
  )} ${getRequirementRelationTargetLabel(relation)}`,
});

export const createRequirementTaskCommentAnchor = (task: {
  id: number;
  task_code: string;
  title: string;
  relation_id?: number;
}): RequirementCommentAnchor => ({
  kind: "requirement_task",
  task_id: task.id,
  ...(task.relation_id ? { relation_id: task.relation_id } : {}),
  label: `関連タスク: ${task.task_code} ${task.title}`,
});

export const getRequirementCommentAnchorKey = (
  targetAnchor: Record<string, unknown>,
) => {
  switch (targetAnchor.kind) {
    case "requirement_field":
      return `requirement_field:${String(targetAnchor.field ?? "")}`;
    case "requirement_detail":
      return `requirement_detail:${String(targetAnchor.detail_id ?? "")}`;
    case "requirement_link":
      return `requirement_link:${String(targetAnchor.link_id ?? "")}`;
    case "requirement_relation":
      return `requirement_relation:${String(targetAnchor.relation_id ?? "")}`;
    case "requirement_task":
      return `requirement_task:${String(targetAnchor.task_id ?? "")}`;
    default:
      return null;
  }
};

export const getRequirementCommentAnchorLabel = (
  targetAnchor: Record<string, unknown> | null | undefined,
) => {
  if (!targetAnchor) {
    return "";
  }
  const label = targetAnchor.label;
  const quote = targetAnchor.quote;
  const field = targetAnchor.field;
  const detailType = targetAnchor.detail_type;

  if (typeof label === "string") {
    return label;
  }
  if (typeof quote === "string") {
    return quote;
  }
  if (typeof detailType === "string") {
    return `実現内容: ${getRequirementDetailTypeLabel(detailType)}`;
  }
  return typeof field === "string" ? field : JSON.stringify(targetAnchor);
};

const getRequirementRelationTargetLabel = (
  relation: RequirementRelationRead,
) => {
  if (!relation.target_summary) {
    return `#${relation.target_id}`;
  }

  return [relation.target_summary.code, relation.target_summary.title]
    .filter(Boolean)
    .join(" ");
};
