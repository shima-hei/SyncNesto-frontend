import { notFound } from "next/navigation";

import { RequirementEditPage } from "@/features/requirements/components/pages/requirement-edit-page";

type PageProps = {
  params: Promise<{
    projectId: string;
    requirementId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId, requirementId } = await params;
  const parsedProjectId = Number(projectId);
  const parsedRequirementId = Number(requirementId);

  if (!Number.isInteger(parsedProjectId) || !Number.isInteger(parsedRequirementId)) {
    notFound();
  }

  return (
    <RequirementEditPage
      projectId={parsedProjectId}
      requirementId={parsedRequirementId}
    />
  );
}
