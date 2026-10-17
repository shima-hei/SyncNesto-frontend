export {
  previewReleaseProjectsProjectIdArtifactReleasesPreviewPost as previewRelease,
  createReleaseProjectsProjectIdArtifactReleasesPost as createRelease,
  listReleasesProjectsProjectIdArtifactReleasesGet as listReleases,
  readReleaseNodesProjectsProjectIdArtifactReleasesReleaseIdNodesGet as readNodes,
} from "@/lib/api/generated/artifact-releases/artifact-releases";
export {
  previewPreservationProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsPreviewPost as previewPreservation,
  reservePreservationProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsPost as reservePreservation,
  listPreservationsProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsGet as listPreservations,
  advancePreservationProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsPreservationIdAdvancePost as advancePreservation,
  cleanupPreservationProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsPreservationIdCleanupPost as cleanupPreservation,
  downloadPreservedAttachmentProjectsProjectIdArtifactReleasesReleaseIdAttachmentPreservationsPreservationIdFilesFileIdDownloadGet as downloadFile,
} from "@/lib/api/generated/artifact-preservations/artifact-preservations";
export {
  listDocumentsProjectsProjectIdDocumentsGet as listDocuments,
  listDocumentAttachmentsProjectsProjectIdDocumentsDocumentIdAttachmentsGet as listAttachments,
} from "@/lib/api/generated/documents/documents";

import {
  readRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGet as readDocument,
  readRequirementProjectsProjectIdRequirementsRequirementIdGet as readRequirement,
} from "@/lib/api/generated/requirements/requirements";
import { readSpecificationProjectsProjectIdSpecificationsSpecificationIdGet as readSpecification } from "@/lib/api/generated/specifications/specifications";
import type { ArtifactKind } from "./navigation";

export async function readSource(
  projectId: number,
  kind: ArtifactKind,
  id: number,
) {
  const row =
    kind === "requirement_document"
      ? await readDocument(projectId, id)
      : kind === "requirement"
        ? await readRequirement(projectId, id)
        : await readSpecification(projectId, id);
  return { kind, id: row.id, title: row.title, version: row.version };
}
