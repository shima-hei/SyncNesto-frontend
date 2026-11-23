import { notFound } from "next/navigation";

import { TaskCreatePage } from "@/features/tasks/components/pages/task-create-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) notFound();
  return <TaskCreatePage projectId={id} />;
}
