import { notFound } from "next/navigation";

import { TasksPage } from "@/features/tasks/components/pages/tasks-page";

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

  return <TasksPage projectId={parsedProjectId} />;
}
