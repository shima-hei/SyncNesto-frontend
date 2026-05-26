"use client";

import { useState } from "react";
import Link from "next/link";
import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCreateRequirement,
  canDeleteRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { formatDateTime } from "@/lib/format/date";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";

import { getRequirementDocumentStatusLabel } from "../../constants/requirement-options";
import { useDeleteRequirementDocument } from "../../hooks/use-delete-requirement-document";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { RequirementsListSection } from "../shared/requirements-list-section";

type RequirementDocumentDetailPageProps = {
  projectId: number;
  documentId: number;
};

export function RequirementDocumentDetailPage({
  projectId,
  documentId,
}: RequirementDocumentDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId
  );
  const { deleteRequirementDocument, isPending: isDeletePending } =
    useDeleteRequirementDocument(projectId, documentId);

  if (isLoading) {
    return <RequirementDocumentDetailSkeleton />;
  }

  if (error || !document) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        要件定義書を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-lg font-semibold">{document.title}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {document.document_code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateRequirement(currentProjectRole) ? (
            <Button asChild>
              <Link
                href={`/projects/joined/${projectId}/requirements/${documentId}/items/new`}
              >
                要件登録
              </Link>
            </Button>
          ) : null}
          {canUpdateRequirement(currentProjectRole) ? (
            <Button asChild variant="outline">
              <Link
                href={`/projects/joined/${projectId}/requirements/${documentId}/edit`}
              >
                <EditIcon data-icon="inline-start" />
                編集
              </Link>
            </Button>
          ) : null}
          {canDeleteRequirement(currentProjectRole) ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              削除
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DocumentInfo
            label="ステータス"
            value={getRequirementDocumentStatusLabel(document.status)}
          />
          <DocumentInfo
            label="対象システム"
            value={document.target_system_name ?? "-"}
          />
          <DocumentInfo label="クライアント" value={document.client_name ?? "-"} />
          <DocumentInfo label="ベンダー" value={document.vendor_name ?? "-"} />
          <DocumentInfo label="目的" value={document.purpose ?? "-"} />
          <DocumentInfo label="更新日時" value={formatDateTime(document.updated_at)} />
        </CardContent>
      </Card>

      <RequirementsListSection projectId={projectId} documentId={documentId} />

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="要件定義書"
        description="削除すると配下の要件も利用できなくなります。内容を確認してから実行してください。"
        isPending={isDeletePending}
        onConfirm={deleteRequirementDocument}
      />
    </div>
  );
}

function DocumentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function RequirementDocumentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
