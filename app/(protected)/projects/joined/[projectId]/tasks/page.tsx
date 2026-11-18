import { notFound, redirect } from "next/navigation";

import { TasksPage } from "@/features/tasks/components/pages/tasks-page";

import { getPlanningHref } from "@/features/tasks/lib/planning-route";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const parsedProjectId = Number(projectId);

  if (!Number.isInteger(parsedProjectId)) {
    notFound();
  }

  const query = await searchParams;
  if ((Array.isArray(query.tab) ? query.tab[0] : query.tab) === "gantt") {
    const source = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string") source.set(key, value);
      else if (value?.length) source.set(key, value[0]);
    }
    redirect(getPlanningHref(parsedProjectId, source));
  }

  return <TasksPage projectId={parsedProjectId} />;
}
