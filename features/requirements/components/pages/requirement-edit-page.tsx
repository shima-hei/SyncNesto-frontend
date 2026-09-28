"use client";

import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/layout/page-header";
import { createDraftScope } from "@/lib/draft/draft-key";

import { getRequirementFormValues } from "../../constants/requirement-form";
import { useRequirement } from "../../hooks/use-requirement";
import { useUpdateRequirement } from "../../hooks/use-update-requirement";
import type { RequirementFormValues } from "../../types/requirement-form";
import { RequirementForm } from "../forms/requirement-form";

type RequirementEditPageProps = {
  projectId: number;
  documentId: number;
  requirementId: number;
};

export function RequirementEditPage({
  projectId,
  documentId,
  requirementId,
}: RequirementEditPageProps) {
  const router = useRouter();
  const { requirement, isLoading, error } = useRequirement(
    projectId,
    requirementId,
  );
  const {
    updateRequirement,
    conflictCurrent,
    resetConflict,
    isPending,
    error: updateError,
  } = useUpdateRequirement(projectId, requirementId);
  const detailPath = `/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}`;
  const handleUpdate = async (
    values: RequirementFormValues,
    version: number,
  ) => {
    await updateRequirement(values, version);
    router.push(detailPath);
  };

  if (isLoading) {
    return <RequirementEditSkeleton />;
  }

  if (error || !requirement) {
    return (
      <div className="text-sm text-muted-foreground">
        要件を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="要件編集" description={requirement.title} />
      <RequirementForm
        key={requirement.version}
        projectId={projectId}
        documentId={documentId}
        mode="update"
        className="w-full max-w-6xl"
        initialOwner={requirement.owner ?? null}
        initialValues={getRequirementFormValues(requirement)}
        draftScope={createDraftScope(
          "requirements",
          "items",
          "update",
          projectId,
          requirementId,
        )}
        draftResourceId={requirementId}
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

          return handleUpdate(values, conflictCurrent.version);
        }}
        onSubmit={(values) => handleUpdate(values, requirement.version)}
      />
    </div>
  );
}

function RequirementEditSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 w-full max-w-6xl" />
    </div>
  );
}
