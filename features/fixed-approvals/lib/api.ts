export {
  previewFixedApprovalProjectsProjectIdFixedApprovalsPreviewPost as previewApproval,
  createFixedApprovalProjectsProjectIdFixedApprovalsPost as createApproval,
  listFixedApprovalsProjectsProjectIdFixedApprovalsGet as listApprovals,
  readFixedApprovalBasisProjectsProjectIdFixedApprovalsBasisGet as readBasis,
  listFixedApprovalCandidatesProjectsProjectIdFixedApprovalsApproverCandidatesGet as listCandidates,
  readFixedApprovalProjectsProjectIdFixedApprovalsApprovalIdGet as readApproval,
  previewFixedApprovalDecisionProjectsProjectIdFixedApprovalsApprovalIdDecisionPreviewPost as previewDecision,
  decideFixedApprovalProjectsProjectIdFixedApprovalsApprovalIdDecisionsPost as decideApproval,
  cancelFixedApprovalProjectsProjectIdFixedApprovalsApprovalIdCancelPost as cancelApproval,
  previewLegacyApprovalMigrationProjectsProjectIdApprovalMigrationsPreviewPost as previewMigration,
  migrateLegacyApprovalProjectsProjectIdApprovalMigrationsPost as migrateApproval,
  readLegacyApprovalImportProjectsProjectIdApprovalMigrationsImportIdGet as readImport,
} from "@/lib/api/generated/fixed-approvals/fixed-approvals";
export {
  readReleaseProjectsProjectIdArtifactReleasesReleaseIdGet as readRelease,
  listReleasesProjectsProjectIdArtifactReleasesGet as listReleases,
} from "@/lib/api/generated/artifact-releases/artifact-releases";
export { listPreservationsProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsGet as listPreservations } from "@/lib/api/generated/artifact-preservations/artifact-preservations";

import type {
  ApprovalBasisRead,
  ArtifactNodeRead,
} from "@/lib/api/generated/model";
import { readNodes } from "@/features/artifact-releases/lib/api";
import { readFixedApprovalBasisProjectsProjectIdFixedApprovalsBasisGet as readBasisPage } from "@/lib/api/generated/fixed-approvals/fixed-approvals";

export async function allReleaseNodes(projectId: number, releaseId: string) {
  const items: ArtifactNodeRead[] = [];
  let cursor: string | undefined;
  do {
    const result = await readNodes(projectId, releaseId, {
      page_size: 100,
      cursor,
    });
    items.push(...result.items);
    cursor = result.next_cursor ?? undefined;
  } while (cursor);
  return items;
}

export async function allBasis(
  projectId: number,
  params: {
    release_id?: string;
    target_node_id?: string;
    approval_id?: string;
  },
) {
  const items: ApprovalBasisRead[] = [];
  let cursor: string | undefined;
  do {
    const result = await readBasisPage(projectId, {
      ...params,
      cursor,
      page_size: 100,
    });
    items.push(...result.items);
    cursor = result.next_cursor ?? undefined;
  } while (cursor);
  return items;
}
