import { notFound } from "next/navigation";

import { RequirementDocumentsPage } from "@/features/requirements/components/pages/requirement-documents-page";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const parsedProjectId = Number(projectId);

  if (!Number.isInteger(parsedProjectId)) {
    notFound();
  }

  return <RequirementDocumentsPage projectId={parsedProjectId} />;
}
