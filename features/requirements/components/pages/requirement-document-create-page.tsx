"use client";

import { createDraftScope } from "@/lib/draft/draft-key";
import { PageHeader } from "@/components/shared/layout/page-header";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Skeleton } from "@/components/ui/skeleton";

import { RequirementDocumentForm } from "../forms/requirement-document-form";
import { initialRequirementDocumentValues } from "../../constants/requirement-form";
import { useCreateRequirementDocument } from "../../hooks/use-create-requirement-document";

type RequirementDocumentCreatePageProps = {
  projectId: number;
};

export function RequirementDocumentCreatePage({
  projectId,
}: RequirementDocumentCreatePageProps) {
  const {
    createRequirementDocument,
    isPending,
    error,
    isReady,
    attempt,
    canUseStandard,
    canSubmit,
    formScope,
    finishDeletedAttempt,
  } = useCreateRequirementDocument(projectId);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="要件定義書登録"
        description="要件を束ねる要件定義書の基本情報を登録します。"
      />
      {!isReady ? (
        <>
          <FormApiError error={error} />
          {!error ? <Skeleton className="h-24" /> : null}
        </>
      ) : (
        <RequirementDocumentForm
          key={formScope}
          canSubmit={canSubmit}
          onFinishDeletedAttempt={finishDeletedAttempt}
          projectId={projectId}
          mode="create"
          initialValues={attempt?.values ?? initialRequirementDocumentValues}
          creationAttempt={attempt}
          canUseStandardChapters={canUseStandard}
          draftScope={createDraftScope(
            "requirements",
            "documents",
            "create",
            projectId,
          )}
          isPending={isPending}
          error={error}
          onSubmit={createRequirementDocument}
        />
      )}
    </div>
  );
}
