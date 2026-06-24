import { notFound } from "next/navigation";

import { RequirementEditPage } from "@/features/requirements/components/pages/requirement-edit-page";

type PageProps = {
  params: Promise<{
    projectId: string;
    documentId: string;
    requirementId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId, documentId, requirementId } = await params;
  const parsedProjectId = Number(projectId);
  const parsedDocumentId = Number(documentId);
  const parsedRequirementId = Number(requirementId);

  if (
    !Number.isInteger(parsedProjectId) ||
    !Number.isInteger(parsedDocumentId) ||
    !Number.isInteger(parsedRequirementId)
  ) {
    notFound();
  }

  return (
    <RequirementEditPage
      projectId={parsedProjectId}
      documentId={parsedDocumentId}
      requirementId={parsedRequirementId}
    />
  );
}
