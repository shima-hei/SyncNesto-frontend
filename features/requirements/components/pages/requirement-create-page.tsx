"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { RequirementForm } from "../forms/requirement-form";
import {
  getDuplicatedRequirementFormValues,
  initialRequirementValues,
} from "../../constants/requirement-form";
import { useCreateRequirement } from "../../hooks/use-create-requirement";
import { useRequirement } from "../../hooks/use-requirement";

type RequirementCreatePageProps = {
  projectId: number;
  documentId: number;
  duplicateFromRequirementId?: number | null;
  initialSectionId?: number | null;
};

export function RequirementCreatePage({
  projectId,
  documentId,
  duplicateFromRequirementId,
  initialSectionId,
}: RequirementCreatePageProps) {
  const { createRequirement, isPending, error } = useCreateRequirement(
    projectId,
    documentId
  );
  const {
    requirement: duplicateSource,
    isLoading: isDuplicateSourceLoading,
    error: duplicateSourceError,
  } = useRequirement(projectId, duplicateFromRequirementId ?? 0, {
    enabled: Boolean(duplicateFromRequirementId),
  });
  const baseInitialValues = duplicateSource
    ? getDuplicatedRequirementFormValues(duplicateSource)
    : initialRequirementValues;
  const initialValues = {
    ...baseInitialValues,
    sectionId: initialSectionId ? String(initialSectionId) : baseInitialValues.sectionId,
  };

  if (isDuplicateSourceLoading) {
    return <RequirementCreateSkeleton />;
  }

  if (duplicateSourceError) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        複製元の要件を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {duplicateSource ? "要件複製" : "要件登録"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {duplicateSource
            ? "複製元の内容をもとに、新しい要件を登録します。"
            : "要件定義書に紐づく要件を登録します。"}
        </p>
      </div>
      <RequirementForm
        key={duplicateSource?.id ?? "new"}
        projectId={projectId}
        documentId={documentId}
        mode="create"
        initialValues={initialValues}
        isPending={isPending}
        error={error}
        onSubmit={createRequirement}
      />
    </div>
  );
}

function RequirementCreateSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-96 w-full max-w-4xl" />
    </div>
  );
}
