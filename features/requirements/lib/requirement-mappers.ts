import type {
  RequirementCommentCreate,
  RequirementCreate,
  RequirementDocumentCreate,
  RequirementDocumentUpdate,
  RequirementLinkCreate,
  RequirementReviewCreate,
  RequirementReviewUpdate,
  RequirementUpdate,
} from "@/lib/api/generated/model";

import { toOptionalNumber } from "../constants/requirement-form";
import type { RequirementCommentFormValues } from "../types/requirement-comment-form";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";
import type { RequirementFormValues } from "../types/requirement-form";
import type { RequirementLinkFormValues } from "../types/requirement-link-form";
import type { RequirementReviewFormValues } from "../types/requirement-review-form";

export const toRequirementCreate = (
  values: RequirementFormValues,
  documentId: number
): RequirementCreate => {
  return {
    document_id: documentId,
    requirement_code: values.requirementCode,
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
  version: number
): RequirementUpdate => {
  return {
    version,
    requirement_code: values.requirementCode,
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
  values: RequirementDocumentFormValues
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

export const toRequirementDocumentUpdate = (
  values: RequirementDocumentFormValues,
  version: number
): RequirementDocumentUpdate => {
  return {
    version,
    ...toRequirementDocumentCreate(values),
  };
};

export const toRequirementCommentCreate = (
  values: RequirementCommentFormValues
): RequirementCommentCreate => {
  return {
    comment: values.comment,
  };
};

export const toRequirementLinkCreate = (
  values: RequirementLinkFormValues
): RequirementLinkCreate => {
  return {
    linked_type: values.linkedType,
    linked_id: values.linkedId,
  };
};

export const toRequirementReviewCreate = (
  values: RequirementReviewFormValues
): RequirementReviewCreate => {
  return {
    reviewer_id: Number(values.reviewerId),
    status: values.status,
    comment: values.comment || null,
    reviewed_at: values.reviewedAt || null,
  };
};

export const toRequirementReviewUpdate = (
  values: RequirementReviewFormValues
): RequirementReviewUpdate => {
  return toRequirementReviewCreate(values);
};
