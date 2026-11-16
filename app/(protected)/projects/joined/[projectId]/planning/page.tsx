import { notFound } from "next/navigation";

import { PlanningPage } from "@/features/tasks/components/pages/planning-page";

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

  return <PlanningPage projectId={parsedProjectId} />;
}
