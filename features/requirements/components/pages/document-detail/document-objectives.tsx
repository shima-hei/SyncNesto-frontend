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
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="案件の目標">
      <h2 className="border-b pb-2 text-xl font-semibold">案件の目標</h2>
      <p className="text-sm text-muted-foreground">
        この文書を概要の出典に指定すると、以下をチームの共通目標として参照できます。
      </p>
      <ProjectObjectiveFields values={document} />
    </section>
  );
}
