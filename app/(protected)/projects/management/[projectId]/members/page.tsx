import { notFound } from "next/navigation";

import { ProjectMembersPage } from "@/features/projects/components/management/project-members-page";
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

  return <ProjectMembersPage projectId={parsedProjectId} />;
}
