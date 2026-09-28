"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/layout/page-header";
import { createDraftScope } from "@/lib/draft/draft-key";

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
    documentId,
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
      <div className="text-sm text-muted-foreground">
        要件定義書を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="要件定義書編集" description={document.title} />
      <RequirementDocumentForm
        key={document.version}
        projectId={projectId}
        mode="update"
        initialValues={getRequirementDocumentFormValues(document)}
        draftScope={createDraftScope(
          "requirements",
          "documents",
          "update",
          projectId,
          documentId,
        )}
        draftResourceId={documentId}
        initialUsers={{
          author: document.author ?? null,
          reviewer: document.reviewer ?? null,
          approver: document.approver ?? null,
        }}
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
        onSubmit={(values) =>
          updateRequirementDocument(values, document.version)
        }
      />
    </div>
  );
}

function RequirementDocumentEditSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 w-full max-w-3xl" />
    </div>
  );
}
