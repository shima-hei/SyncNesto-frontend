import { notFound } from "next/navigation";

import { ProjectDetailPage } from "@/features/projects/components/project-detail-page";
import { requireSystemAdmin } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireSystemAdmin();

  const { projectId } = await params;
  const parsedProjectId = Number(projectId);

  if (!Number.isInteger(parsedProjectId)) {
    notFound();
  }

  return <ProjectDetailPage projectId={parsedProjectId} />;
}
