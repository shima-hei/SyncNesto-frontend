"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/layout/page-header";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canDeleteDocument,
  canUpdateDocument,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import {
  readDocumentProjectsProjectIdDocumentsDocumentIdGet as readDocument,
  deleteDocumentProjectsProjectIdDocumentsDocumentIdDelete as deleteDocument,
} from "@/lib/api/generated/documents/documents";
import { formatDateTime } from "@/lib/format/date";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { documentKeys, documentsHref } from "../../lib/document";
import { DocumentAttachments } from "../shared/document-attachments";
import { DocumentLinks } from "../shared/document-links";
import { DocumentHistory } from "../shared/document-history";
import { DocumentLoadError } from "../shared/document-feedback";

export function DocumentDetailPage({
  projectId,
  documentId,
}: {
  projectId: number;
  documentId: number;
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const cache = useQueryClient();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const query = useQuery({
    queryKey: documentKeys.detail(projectId, documentId),
    queryFn: () => readDocument(projectId, documentId),
    retry: false,
  });
  const remove = useMutation({
    mutationFn: () =>
      deleteDocument(projectId, documentId, { version: query.data!.version }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: documentKeys.all(projectId) });
      toast.success("ドキュメントを削除しました。");
      router.push(documentsHref(projectId));
    },
    onError: (error) => {
      setDeleting(false);
      toast.error(getApiErrorMessage(error));
      void query.refetch();
    },
  });
  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.error)
    return (
      <DocumentLoadError
        error={query.error}
        projectId={projectId}
        retry={() => void query.refetch()}
      />
    );
  const document = query.data;
  const canEdit = canUpdateDocument(currentProjectRole);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title={document.title}
        description={`版 ${document.version}・更新 ${formatDateTime(document.updated_at)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={documentsHref(projectId)}>一覧へ戻る</Link>
            </Button>
            {canEdit ? (
              <Button asChild>
                <Link href={`${documentsHref(projectId, documentId)}/edit`}>
                  編集
                </Link>
              </Button>
            ) : null}
            {canDeleteDocument(currentProjectRole) ? (
              <Button variant="outline" onClick={() => setDeleting(true)}>
                削除
              </Button>
            ) : null}
          </>
        }
      />
      <FormApiError error={remove.error} />
      <Tabs defaultValue="body" className="min-w-0">
        <TabsList variant="line" className="max-w-full">
          <TabsTrigger value="body">本文</TabsTrigger>
          <TabsTrigger value="attachments">添付</TabsTrigger>
          <TabsTrigger value="links">関連</TabsTrigger>
          <TabsTrigger value="history">版履歴</TabsTrigger>
        </TabsList>
        <TabsContent value="body">
          <MarkdownPreview
            value={document.body}
            emptyMessage="本文はまだありません。"
            className="max-w-4xl break-words"
          />
        </TabsContent>
        <TabsContent value="attachments">
          <DocumentAttachments
            projectId={projectId}
            documentId={documentId}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="links">
          <DocumentLinks
            projectId={projectId}
            documentId={documentId}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="history">
          <DocumentHistory
            projectId={projectId}
            documentId={documentId}
            currentVersion={document.version}
          />
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="ドキュメントを削除しますか"
        description="本文・添付・版履歴が閲覧できなくなり、一覧からも除かれます。"
        confirmLabel="削除"
        destructive
        isPending={remove.isPending}
        onConfirm={() =>
          remove
            .mutateAsync()
            .then(() => setDeleting(false))
            .catch(() => undefined)
        }
      />
    </div>
  );
}
