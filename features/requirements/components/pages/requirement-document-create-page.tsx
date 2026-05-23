"use client";

import { RequirementDocumentForm } from "../forms/requirement-document-form";
import { initialRequirementDocumentValues } from "../../constants/requirement-form";
import { useCreateRequirementDocument } from "../../hooks/use-create-requirement-document";

type RequirementDocumentCreatePageProps = {
  projectId: number;
};

export function RequirementDocumentCreatePage({
  projectId,
}: RequirementDocumentCreatePageProps) {
  const { createRequirementDocument, isPending, error } =
    useCreateRequirementDocument(projectId);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">要件定義書登録</h2>
        <p className="text-sm text-muted-foreground">
          要件を束ねる要件定義書の基本情報を登録します。
        </p>
      </div>
      <RequirementDocumentForm
        mode="create"
        initialValues={initialRequirementDocumentValues}
        isPending={isPending}
        error={error}
        onSubmit={createRequirementDocument}
      />
    </div>
  );
}
