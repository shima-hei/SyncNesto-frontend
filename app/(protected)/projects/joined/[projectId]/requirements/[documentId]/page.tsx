import { notFound } from "next/navigation";

import { RequirementDocumentDetailPage } from "@/features/requirements/components/pages/requirement-document-detail-page";

type PageProps = {
  params: Promise<{
    projectId: string;
    documentId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId, documentId } = await params;
  const parsedProjectId = Number(projectId);
  const parsedDocumentId = Number(documentId);

  if (!Number.isInteger(parsedProjectId) || !Number.isInteger(parsedDocumentId)) {
    notFound();
  }

  return (
    <RequirementDocumentDetailPage
      projectId={parsedProjectId}
      documentId={parsedDocumentId}
    />
  );
}
