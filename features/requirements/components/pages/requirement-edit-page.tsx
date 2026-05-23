"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { getRequirementFormValues } from "../../constants/requirement-form";
import { useRequirement } from "../../hooks/use-requirement";
import { useUpdateRequirement } from "../../hooks/use-update-requirement";
import { RequirementForm } from "../forms/requirement-form";

type RequirementEditPageProps = {
  projectId: number;
  requirementId: number;
};

export function RequirementEditPage({
  projectId,
  requirementId,
}: RequirementEditPageProps) {
  const { requirement, isLoading, error } = useRequirement(
    projectId,
    requirementId
  );
  const {
    updateRequirement,
    conflictCurrent,
    resetConflict,
    isPending,
    error: updateError,
  } = useUpdateRequirement(projectId, requirementId);

  if (isLoading) {
    return <RequirementEditSkeleton />;
  }

  if (error || !requirement) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        要件を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">要件編集</h2>
        <p className="text-sm text-muted-foreground">{requirement.title}</p>
      </div>
      <RequirementForm
        key={requirement.version}
        mode="update"
        initialValues={getRequirementFormValues(requirement)}
        isPending={isPending}
        error={updateError}
        conflictValues={
          conflictCurrent ? getRequirementFormValues(conflictCurrent) : null
        }
        onCloseConflict={resetConflict}
        onResolveConflict={(values) => {
          if (!conflictCurrent) {
            return Promise.resolve();
          }

          return updateRequirement(values, conflictCurrent.version);
        }}
        onSubmit={(values) => updateRequirement(values, requirement.version)}
      />
    </div>
  );
}

function RequirementEditSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-96 w-full max-w-4xl" />
    </div>
  );
}
