"use client";

import { useProjectObjectives } from "@/features/projects/hooks/use-project-objectives";
import { ProjectObjectiveFields } from "@/features/projects/components/shared/project-objective-fields";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";

export function DocumentObjectives({
  projectId,
  document,
}: {
  projectId: number;
  document: RequirementDocumentRead;
}) {
  const query = useProjectObjectives(projectId);
  if (!query.data?.enabled || query.data.state === "restricted") return null;
  const hasObjectives = [
    document.project_goal,
    document.project_scope,
    document.project_completion_criteria,
  ].some((value) => value?.trim());
  const fields = (
    <div className="flex min-w-0 flex-col gap-4">
      <ProjectObjectiveFields values={document} document />
    </div>
  );
  if (!hasObjectives) {
    return (
      <details className="rounded-md border px-4 py-3">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
          案件の目標
        </summary>
        <div className="pt-3">{fields}</div>
      </details>
    );
  }
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="案件の目標">
      <h2 className="border-b pb-2 text-xl font-semibold">案件の目標</h2>
      {fields}
    </section>
  );
}
