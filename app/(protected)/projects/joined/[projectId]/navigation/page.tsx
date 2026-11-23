import { notFound } from "next/navigation";

import { ProjectNavigationPage } from "@/features/projects/components/management/project-navigation-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) notFound();
  return <ProjectNavigationPage projectId={projectId} />;
}
