import type {
  RequirementCommentCreate,
  RequirementCreate,
  RequirementApprovalRequestCreate,
  RequirementDetailCreate,
  RequirementDetailUpdate,
  RequirementDocumentCreate,
  RequirementDocumentUpdate,
  RequirementLinkCreate,
  RequirementLinkUpdate,
  RequirementOpenIssueCreate,
  RequirementOpenIssuePromoteCreate,
  RequirementOpenIssueUpdate,
  RequirementRelationCreate,
  RequirementReviewCreate,
  RequirementReviewUpdate,
  RequirementSectionCreate,
  RequirementSectionUpdate,
  RequirementTargetCommentCreate,
  RequirementTargetCommentUpdate,
  RequirementUpdate,
} from "@/lib/api/generated/model";

import { toOptionalNumber } from "../constants/requirement-form";
import {
  toRequirementDetailJson,
  toRequirementDetailType,
} from "./requirement-detail-metadata";
import type { RequirementApprovalRequestFormValues } from "../types/requirement-approval-form";
import type { RequirementCommentFormValues } from "../types/requirement-comment-form";
import type { RequirementDetailFormValues } from "../types/requirement-detail-form";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";
import type { RequirementFormValues } from "../types/requirement-form";
import type { RequirementLinkFormValues } from "../types/requirement-link-form";
import type { RequirementOpenIssueFormValues } from "../types/requirement-open-issue-form";
import type { RequirementRelationFormValues } from "../types/requirement-relation-form";
import type { RequirementReviewFormValues } from "../types/requirement-review-form";
import type { RequirementSectionFormValues } from "../types/requirement-section-form";
import type { RequirementTargetCommentFormValues } from "../types/requirement-target-comment-form";

export const toRequirementCreate = (
  values: RequirementFormValues,
  documentId: number,
): RequirementCreate => {
  return {
    document_id: documentId,
    section_id: toOptionalNumber(values.sectionId),
    requirement_type: values.requirementType,
    category: values.category || null,
    title: values.title,
    description: values.description || null,
    rationale: values.rationale || null,
    acceptance_criteria: values.acceptanceCriteria || null,
    priority: values.priority,
    status: values.status,
    source: values.source || null,
    owner_id: toOptionalNumber(values.ownerId),
    approved_by: toOptionalNumber(values.approvedBy),
    approved_at: values.approvedAt || null,
  };
};

export const toRequirementUpdate = (
  values: RequirementFormValues,
  version: number,
): RequirementUpdate => {
  return {
    version,
    section_id: toOptionalNumber(values.sectionId),
    requirement_type: values.requirementType,
    category: values.category || null,
    title: values.title,
    description: values.description || null,
    rationale: values.rationale || null,
    acceptance_criteria: values.acceptanceCriteria || null,
    priority: values.priority,
    status: values.status,
    source: values.source || null,
    owner_id: toOptionalNumber(values.ownerId),
    approved_by: toOptionalNumber(values.approvedBy),
    approved_at: values.approvedAt || null,
    change_summary: values.changeSummary || null,
    reason: values.reason || null,
  };
};

export const toRequirementDocumentCreate = (
  values: RequirementDocumentFormValues,
): RequirementDocumentCreate => {
  return {
    title: values.title,
    document_code: values.documentCode,
    status: values.status,
    purpose: values.purpose || null,
    target_system_name: values.targetSystemName || null,
    client_name: values.clientName || null,
    vendor_name: values.vendorName || null,
    author_id: toOptionalNumber(values.authorId),
    reviewer_id: toOptionalNumber(values.reviewerId),
    approver_id: toOptionalNumber(values.approverId),
    approved_at: values.approvedAt || null,
  };
};

export const toRequirementDetailCreate = (
  values: RequirementDetailFormValues,
): RequirementDetailCreate => {
  return {
    detail_type: toRequirementDetailType(values),
    detail_json: toRequirementDetailJson(values),
  };
};

export const toRequirementDetailUpdate = (
  values: RequirementDetailFormValues,
): RequirementDetailUpdate => {
  return {
    detail_type: toRequirementDetailType(values),
    detail_json: toRequirementDetailJson(values),
  };
};

export const toRequirementDocumentUpdate = (
  values: RequirementDocumentFormValues,
  version: number,
): RequirementDocumentUpdate => {
  return {
    version,
    ...toRequirementDocumentCreate(values),
  };
};

export const toRequirementCommentCreate = (
  values: RequirementCommentFormValues,
): RequirementCommentCreate => {
  return {
    comment: values.comment,
  };
};

export const toRequirementLinkCreate = (
  values: RequirementLinkFormValues,
): RequirementLinkCreate => {
  return {
    linked_type: values.linkedType,
    linked_id: values.linkedId,
    linked_url: values.linkedUrl || null,
    status: values.status,
  };
};

export const toRequirementLinkUpdate = (
  values: RequirementLinkFormValues,
): RequirementLinkUpdate => {
  return {
    linked_type: values.linkedType,
    linked_id: values.linkedId,
    linked_url: values.linkedUrl || null,
    status: values.status,
  };
};

export const toRequirementRelationCreate = (
  values: RequirementRelationFormValues,
): RequirementRelationCreate => {
  return {
    target_type: values.targetType,
    target_id: values.targetId,
    relation_type: values.relationType,
    description: values.description || null,
  };
};

export const toRequirementTargetCommentCreate = (
  values: RequirementTargetCommentFormValues,
  targetType: string,
  targetId: number,
  parentCommentId?: number | null,
): RequirementTargetCommentCreate => {
  return {
    target_type: targetType,
    target_id: targetId,
    target_anchor: toRequirementTargetAnchor(values.targetAnchor),
    parent_comment_id: parentCommentId ?? null,
    body: values.body,
  };
};

const toRequirementTargetAnchor = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }
  try {
    const parsedValue: unknown = JSON.parse(trimmed);

    if (
      parsedValue &&
      typeof parsedValue === "object" &&
      !Array.isArray(parsedValue)
    ) {
      return parsedValue as Record<string, unknown>;
    }
  } catch {
    return { label: trimmed };
  }
  return { label: trimmed };
};

export const toRequirementTargetCommentUpdate = (
  values: RequirementTargetCommentFormValues,
  version: number,
): RequirementTargetCommentUpdate => {
  return {
    version,
    body: values.body,
    reason: values.reason || null,
  };
};

export const toRequirementReviewCreate = (
  values: RequirementReviewFormValues,
): RequirementReviewCreate => {
  return {
    reviewer_id: Number(values.reviewerId),
    status: values.status,
    comment: values.comment || null,
    reviewed_at: values.reviewedAt || null,
  };
};

export const toRequirementReviewUpdate = (
  values: RequirementReviewFormValues,
): RequirementReviewUpdate => {
  return toRequirementReviewCreate(values);
};

export const toRequirementSectionCreate = (
  values: RequirementSectionFormValues,
): RequirementSectionCreate => {
  return {
    title: values.title,
    section_type: values.sectionType,
    content: values.content || null,
    sort_order: Number(values.sortOrder),
    status: values.status,
  };
};

export const toRequirementSectionUpdate = (
  values: RequirementSectionFormValues,
  version: number,
): RequirementSectionUpdate => {
  return {
    version,
    title: values.title,
    section_type: values.sectionType,
    content: values.content || null,
    sort_order: Number(values.sortOrder),
    status: values.status,
  };
};

export const toRequirementOpenIssueCreate = (
  values: RequirementOpenIssueFormValues,
  documentId: number,
): RequirementOpenIssueCreate => {
  return {
    document_id: documentId,
    title: values.title,
    description: values.description || null,
    impact_scope: values.impactScope || null,
    related_requirement_id: toOptionalNumber(values.relatedRequirementId),
    assignee_id: toOptionalNumber(values.assigneeId),
    due_date: values.dueDate || null,
    status: values.status,
    resolution: values.resolution || null,
  };
};

export const toRequirementOpenIssueUpdate = (
  values: RequirementOpenIssueFormValues,
  version: number,
): RequirementOpenIssueUpdate => {
  return {
    version,
    title: values.title,
    description: values.description || null,
    impact_scope: values.impactScope || null,
    related_requirement_id: toOptionalNumber(values.relatedRequirementId),
    assignee_id: toOptionalNumber(values.assigneeId),
    due_date: values.dueDate || null,
    status: values.status,
    resolution: values.resolution || null,
    reason: values.reason || null,
  };
};

export const toRequirementOpenIssuePromoteCreate = (
  issue: RequirementOpenIssueFormValues,
  version: number,
): RequirementOpenIssuePromoteCreate => {
  return {
    version,
    title: issue.title,
    description: issue.description || null,
    priority: "must",
    status: "draft",
    resolution: issue.resolution || null,
    reason: "未決事項から昇格",
  };
};

export const toRequirementApprovalRequestCreate = (
  values: RequirementApprovalRequestFormValues,
  targetType: string,
  targetId: number,
): RequirementApprovalRequestCreate => {
  return {
    target_type: targetType,
    target_id: targetId,
    approver_id: Number(values.approverId),
    comment: values.comment || null,
  };
};
