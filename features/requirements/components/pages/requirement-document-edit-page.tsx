"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { getRequirementDocumentFormValues } from "../../constants/requirement-form";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { useUpdateRequirementDocument } from "../../hooks/use-update-requirement-document";
import { RequirementDocumentForm } from "../forms/requirement-document-form";

type RequirementDocumentEditPageProps = {
  projectId: number;
  documentId: number;
};

export function RequirementDocumentEditPage({
  projectId,
  documentId,
}: RequirementDocumentEditPageProps) {
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId
  );
  const {
    updateRequirementDocument,
    conflictCurrent,
    resetConflict,
    isPending,
    error: updateError,
  } = useUpdateRequirementDocument(projectId, documentId);

  if (isLoading) {
    return <RequirementDocumentEditSkeleton />;
  }

  if (error || !document) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        要件定義書を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">要件定義書編集</h2>
        <p className="text-sm text-muted-foreground">{document.title}</p>
      </div>
      <RequirementDocumentForm
        key={document.version}
        mode="update"
        initialValues={getRequirementDocumentFormValues(document)}
        isPending={isPending}
        error={updateError}
        conflictValues={
          conflictCurrent
            ? getRequirementDocumentFormValues(conflictCurrent)
            : null
        }
        onCloseConflict={resetConflict}
        onResolveConflict={(values) => {
          if (!conflictCurrent) {
            return Promise.resolve();
          }

          return updateRequirementDocument(values, conflictCurrent.version);
        }}
        onSubmit={(values) => updateRequirementDocument(values, document.version)}
      />
    </div>
  );
}

function RequirementDocumentEditSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-96 w-full max-w-3xl" />
    </div>
  );
}
