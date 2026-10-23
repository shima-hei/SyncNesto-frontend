import type { ApprovalNextAction } from "@/lib/api/generated/model";

export function approvalNextActionHref(
  projectId: number,
  action: ApprovalNextAction,
) {
  const base = `/projects/joined/${projectId}`;
  if (action.kind === "open_publication")
    return action.publication_id
      ? `${base}/artifact-publications?publication=${encodeURIComponent(action.publication_id)}`
      : null;
  if (action.kind === "open_fixed_versions") return `${base}/artifact-releases`;
  const id = action.source_id;
  if (!id) return null;
  const editing = action.kind === "edit_source";
  switch (action.source_kind) {
    case "requirement":
      return action.document_id
        ? `${base}/requirements/${action.document_id}/items/${id}${editing ? "/edit" : ""}`
        : null;
    case "requirement_document":
      return `${base}/requirements/${id}${editing ? "/edit" : ""}`;
    case "specification":
      return `${base}/specifications/${id}${editing ? "/edit" : ""}`;
    case "test_design":
      return `${base}/test-designs/${id}`;
    default:
      return null;
  }
}
