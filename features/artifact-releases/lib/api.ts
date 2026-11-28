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
import {
  readSpecificationProjectsProjectIdSpecificationsSpecificationIdGet as readSpecification,
  readSpecificationRevisionProjectsProjectIdSpecificationsSpecificationIdRevisionsNumberGet as readSpecificationRevision,
} from "@/lib/api/generated/specifications/specifications";
import { ApiError } from "@/lib/api/error";
import { readTestDesignProjectsProjectIdTestDesignsDesignIdGet as readTestDesign } from "@/lib/api/generated/test-designs/test-designs";
import type { ArtifactKind } from "./navigation";

export async function readSource(
  projectId: number,
  kind: ArtifactKind,
  id: number,
  version?: number,
) {
  if (kind === "test_design") {
    const row = await readTestDesign(projectId, id);
    return {
      kind,
      id: row.id,
      title: row.name,
      version: row.version,
      counts: {
        items: row.items.filter((item) => !item.is_spacer).length,
        factors: row.factors.length,
        levels: row.levels.length,
        patterns: row.patterns.length,
      },
    };
  }
  const row =
    kind === "requirement_document"
      ? await readDocument(projectId, id)
      : kind === "requirement"
        ? await readRequirement(projectId, id)
        : await readSpecification(projectId, id);
  if (kind === "specification" && version && version !== row.version) {
    try {
      const revision = await readSpecificationRevision(projectId, id, version);
      if (
        revision.snapshot.status === "approved" &&
        typeof revision.snapshot.title === "string"
      )
        return { kind, id, title: revision.snapshot.title, version };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
  }
  return { kind, id: row.id, title: row.title, version: row.version };
}
