"use client";

import { useState } from "react";
import Link from "next/link";
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCreateRequirement,
  canCommentRequirement,
  canDeleteRequirement,
  canReviewRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { RequirementDocumentExportRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { getRequirementDocumentStatusLabel } from "../../constants/requirement-options";
import { useDeleteRequirementDocument } from "../../hooks/use-delete-requirement-document";
import { useExportRequirementDocument } from "../../hooks/use-export-requirement-document";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { RequirementDocumentExportDialog } from "../forms/requirement-document-export-dialog";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../sections/requirement-change-logs-section";
import { RequirementOpenIssuesSection } from "../sections/requirement-open-issues-section";
import { RequirementSectionsSection } from "../sections/requirement-sections-section";
import { RequirementTargetCommentsSection } from "../sections/requirement-target-comments-section";
import { RequirementsListSection } from "../sections/requirements-list-section";
import { SelectedRequirementSectionContent } from "../sections/selected-requirement-section-content";
import { SelectedRequirementSummarySection } from "../sections/selected-requirement-summary-section";

type RequirementDocumentDetailPageProps = {
  projectId: number;
  documentId: number;
};

export function RequirementDocumentDetailPage({
  projectId,
  documentId,
}: RequirementDocumentDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPreview, setExportPreview] =
    useState<RequirementDocumentExportRead | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(
    null
  );
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId
  );
  const { deleteRequirementDocument, isPending: isDeletePending } =
    useDeleteRequirementDocument(projectId, documentId);
  const { exportRequirementDocument, isPending: isExportPending } =
    useExportRequirementDocument(projectId, documentId);

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
          <Button
            type="button"
            variant="outline"
            disabled={isExportPending}
            onClick={() => setExportDialogOpen(true)}
          >
            <DownloadIcon data-icon="inline-start" />
            出力
          </Button>
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

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px] xl:items-start">
        <div className="min-w-0 xl:sticky xl:top-20">
          <RequirementSectionsSection
            projectId={projectId}
            documentId={documentId}
            canUpdate={canUpdateRequirement(currentProjectRole)}
            selectedSectionId={selectedSectionId}
            onSelectSection={(sectionId) => {
              setSelectedSectionId(sectionId);
              setSelectedRequirementId(null);
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SelectedRequirementSectionContent
            projectId={projectId}
            documentId={documentId}
            sectionId={selectedSectionId}
          />
          <RequirementsListSection
            projectId={projectId}
            documentId={documentId}
            sectionId={selectedSectionId}
            canUpdate={canUpdateRequirement(currentProjectRole)}
            selectedRequirementId={selectedRequirementId}
            onSelectRequirement={setSelectedRequirementId}
          />
          <RequirementOpenIssuesSection
            projectId={projectId}
            documentId={documentId}
            canCreate={canCreateRequirement(currentProjectRole)}
            canUpdate={canUpdateRequirement(currentProjectRole)}
            canDelete={canDeleteRequirement(currentProjectRole)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-20">
          <SelectedRequirementSummarySection
            projectId={projectId}
            documentId={documentId}
            requirementId={selectedRequirementId}
          />
          {selectedRequirementId ? (
            <>
              <RequirementTargetCommentsSection
                projectId={projectId}
                targetType="requirement_item"
                targetId={selectedRequirementId}
                title="要件コメント"
                canComment={canCommentRequirement(currentProjectRole)}
              />
              <RequirementApprovalsSection
                projectId={projectId}
                targetType="requirement_item"
                targetId={selectedRequirementId}
                title="要件の承認"
                canReview={canReviewRequirement(currentProjectRole)}
              />
              <RequirementChangeLogsSection
                projectId={projectId}
                documentId={documentId}
                title="要件の変更履歴"
                targetType="requirement_item"
                targetId={selectedRequirementId}
              />
            </>
          ) : null}
          {selectedSectionId && !selectedRequirementId ? (
            <RequirementTargetCommentsSection
              projectId={projectId}
              targetType="section"
              targetId={selectedSectionId}
              title="セクションコメント"
              canComment={canCommentRequirement(currentProjectRole)}
            />
          ) : null}
          {!selectedSectionId && !selectedRequirementId ? (
            <RequirementTargetCommentsSection
              projectId={projectId}
              targetType="document"
              targetId={documentId}
              title="要件定義書コメント"
              canComment={canCommentRequirement(currentProjectRole)}
            />
          ) : null}
          <RequirementApprovalsSection
            projectId={projectId}
            targetType="document"
            targetId={documentId}
            title="要件定義書の承認"
            canReview={canReviewRequirement(currentProjectRole)}
          />
          {selectedSectionId && !selectedRequirementId ? (
            <RequirementApprovalsSection
              projectId={projectId}
              targetType="section"
              targetId={selectedSectionId}
              title="セクションの承認"
              canReview={canReviewRequirement(currentProjectRole)}
            />
          ) : null}
          {selectedSectionId && !selectedRequirementId ? (
            <RequirementChangeLogsSection
              projectId={projectId}
              documentId={documentId}
              title="セクションの変更履歴"
              targetType="section"
              targetId={selectedSectionId}
            />
          ) : null}
          <RequirementChangeLogsSection
            projectId={projectId}
            documentId={documentId}
            title="要件定義書の変更履歴"
            targetType="document"
            targetId={documentId}
          />
        </div>
      </div>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="要件定義書"
        description="削除すると配下の要件も利用できなくなります。内容を確認してから実行してください。"
        isPending={isDeletePending}
        onConfirm={deleteRequirementDocument}
      />
      <RequirementDocumentExportDialog
        open={exportDialogOpen}
        isPending={isExportPending}
        preview={exportPreview}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) {
            setExportPreview(null);
          }
        }}
        onExport={exportRequirementDocument}
        onPreviewChange={setExportPreview}
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
