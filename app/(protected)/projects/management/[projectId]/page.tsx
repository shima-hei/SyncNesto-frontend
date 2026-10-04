import { notFound } from "next/navigation";

import { ProjectDetailPage } from "@/features/projects/components/management/project-detail-page";
import { requireUser } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireUser();

  const { projectId } = await params;
  const parsedProjectId = Number(projectId);

  if (!Number.isInteger(parsedProjectId)) {
    notFound();
  }

  return <ProjectDetailPage projectId={parsedProjectId} />;
}
