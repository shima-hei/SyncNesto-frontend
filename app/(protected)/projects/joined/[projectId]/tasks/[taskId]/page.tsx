import { notFound } from "next/navigation";

import { TaskDetailPage } from "@/features/tasks/components/pages/task-detail-page";

type PageProps = {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId, taskId } = await params;
  const parsedProjectId = Number(projectId);
  const parsedTaskId = Number(taskId);

  if (!Number.isInteger(parsedProjectId) || !Number.isInteger(parsedTaskId)) {
    notFound();
  }

  return <TaskDetailPage projectId={parsedProjectId} taskId={parsedTaskId} />;
}
