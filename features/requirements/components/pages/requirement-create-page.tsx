"use client";

import { RequirementForm } from "../forms/requirement-form";
import { initialRequirementValues } from "../../constants/requirement-form";
import { useCreateRequirement } from "../../hooks/use-create-requirement";

type RequirementCreatePageProps = {
  projectId: number;
  documentId: number;
};

export function RequirementCreatePage({
  projectId,
  documentId,
}: RequirementCreatePageProps) {
  const { createRequirement, isPending, error } = useCreateRequirement(
    projectId,
    documentId
  );

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">要件登録</h2>
        <p className="text-sm text-muted-foreground">
          要件定義書に紐づく要件を登録します。
        </p>
      </div>
      <RequirementForm
        mode="create"
        initialValues={initialRequirementValues}
        isPending={isPending}
        error={error}
        onSubmit={createRequirement}
      />
    </div>
  );
}
