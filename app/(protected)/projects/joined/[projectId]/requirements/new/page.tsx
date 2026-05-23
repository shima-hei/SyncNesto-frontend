import { notFound } from "next/navigation";

import { RequirementDocumentCreatePage } from "@/features/requirements/components/pages/requirement-document-create-page";

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

  return <RequirementDocumentCreatePage projectId={parsedProjectId} />;
}
