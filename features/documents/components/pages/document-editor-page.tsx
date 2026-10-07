"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCreateDocument,
  canUpdateDocument,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { readDocumentProjectsProjectIdDocumentsDocumentIdGet as readDocument } from "@/lib/api/generated/documents/documents";
import { documentKeys } from "../../lib/document";
import { DocumentForm } from "../forms/document-form";
import { DocumentLoadError } from "../shared/document-feedback";

export function DocumentEditorPage({
  projectId,
  documentId,
}: {
  projectId: number;
  documentId?: number;
}) {
  const { currentProjectRole, isLoading: roleLoading } =
    useCurrentProjectRole(projectId);
  const query = useQuery({
    queryKey: documentKeys.detail(projectId, documentId ?? 0),
    queryFn: () => readDocument(projectId, documentId!),
    enabled: Boolean(documentId),
    retry: false,
  });
  if (roleLoading || (documentId && query.isPending))
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  if (query.error)
    return (
      <DocumentLoadError
        error={query.error}
        projectId={projectId}
        retry={() => void query.refetch()}
      />
    );
  const allowed = documentId
    ? canUpdateDocument(currentProjectRole)
    : canCreateDocument(currentProjectRole);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title={documentId ? "ドキュメント編集" : "ドキュメント登録"}
        description="Markdownで本文を作成できます。保存後に添付と関連付けを追加できます。"
      />
      {allowed ? (
        <DocumentForm
          key={documentId ?? "new"}
          projectId={projectId}
          document={query.data}
        />
      ) : (
        <p role="alert">この操作を行う権限がありません。</p>
      )}
    </div>
  );
}
