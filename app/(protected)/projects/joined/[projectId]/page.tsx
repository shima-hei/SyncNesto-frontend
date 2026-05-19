import { notFound } from "next/navigation";

import { JoinedProjectDetailPage } from "@/features/projects/components/joined-project-detail-page";

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

  return <JoinedProjectDetailPage projectId={parsedProjectId} />;
}
