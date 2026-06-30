import { notFound } from "next/navigation";

import { JoinedProjectMembersPage } from "@/features/projects/components/joined/joined-project-members-page";

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

  return <JoinedProjectMembersPage projectId={parsedProjectId} />;
}
