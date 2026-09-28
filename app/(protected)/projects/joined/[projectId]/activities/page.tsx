import { notFound } from "next/navigation";

import { ProjectActivitiesPage } from "@/features/projects/components/joined/project-activities-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const parsedProjectId = Number(projectId);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) notFound();
  return <ProjectActivitiesPage projectId={parsedProjectId} />;
}
