import type {
  RequirementDocumentRead,
  RequirementRead,
} from "@/lib/api/generated/model";

import type { RequirementDocumentFormValues } from "../types/requirement-document-form";
import type { RequirementFormValues } from "../types/requirement-form";

export const initialRequirementDocumentValues: RequirementDocumentFormValues = {
  title: "",
  documentCode: "",
  status: "draft",
  purpose: "",
  targetSystemName: "",
  clientName: "",
  vendorName: "",
  authorId: "",
  reviewerId: "",
  approverId: "",
  approvedAt: "",
};

export const initialRequirementValues: RequirementFormValues = {
  requirementCode: "",
  requirementType: "functional",
  category: "",
  title: "",
  description: "",
  rationale: "",
  acceptanceCriteria: "",
  priority: "must",
  status: "draft",
  source: "",
  ownerId: "",
  approvedBy: "",
  approvedAt: "",
  changeSummary: "",
  reason: "",
};

export const getRequirementDocumentFormValues = (
  document: RequirementDocumentRead
): RequirementDocumentFormValues => {
  return {
    title: document.title,
    documentCode: document.document_code,
    status: document.status ?? "draft",
    purpose: document.purpose ?? "",
    targetSystemName: document.target_system_name ?? "",
    clientName: document.client_name ?? "",
    vendorName: document.vendor_name ?? "",
    authorId: toOptionalId(document.author_id),
    reviewerId: toOptionalId(document.reviewer_id),
    approverId: toOptionalId(document.approver_id),
    approvedAt: toDateTimeLocalValue(document.approved_at),
  };
};

export const getRequirementFormValues = (
  requirement: RequirementRead
): RequirementFormValues => {
  return {
    requirementCode: requirement.requirement_code,
    requirementType: requirement.requirement_type,
    category: requirement.category ?? "",
    title: requirement.title,
    description: requirement.description ?? "",
    rationale: requirement.rationale ?? "",
    acceptanceCriteria: requirement.acceptance_criteria ?? "",
    priority: requirement.priority ?? "must",
    status: requirement.status ?? "draft",
    source: requirement.source ?? "",
    ownerId: toOptionalId(requirement.owner_id),
    approvedBy: toOptionalId(requirement.approved_by),
    approvedAt: toDateTimeLocalValue(requirement.approved_at),
    changeSummary: "",
    reason: "",
  };
};

export const toOptionalNumber = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isInteger(parsedValue) ? parsedValue : null;
};

const toOptionalId = (value?: number | null) => {
  return value ? String(value) : "";
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
};
