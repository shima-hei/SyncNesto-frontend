import { notFound } from "next/navigation";

import { RequirementCreatePage } from "@/features/requirements/components/pages/requirement-create-page";

type PageProps = {
  params: Promise<{
    projectId: string;
    documentId: string;
  }>;
  searchParams: Promise<{
    duplicateFrom?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { projectId, documentId } = await params;
  const { duplicateFrom } = await searchParams;
  const parsedProjectId = Number(projectId);
  const parsedDocumentId = Number(documentId);
  const duplicateFromRequirementId = duplicateFrom
    ? Number(duplicateFrom)
    : null;

  if (
    !Number.isInteger(parsedProjectId) ||
    !Number.isInteger(parsedDocumentId) ||
    (duplicateFromRequirementId !== null &&
      !Number.isInteger(duplicateFromRequirementId))
  ) {
    notFound();
  }

  return (
    <RequirementCreatePage
      projectId={parsedProjectId}
      documentId={parsedDocumentId}
      duplicateFromRequirementId={duplicateFromRequirementId}
    />
  );
}
