"use client";

import { useState } from "react";
import Link from "next/link";
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  canCreateRequirement,
  canCommentRequirement,
  canDeleteRequirement,
  canReviewRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type {
  RequirementDocumentExportRead,
} from "@/lib/api/generated/model";

import { useDeleteRequirementDocument } from "../../hooks/use-delete-requirement-document";
import { useExportRequirementDocument } from "../../hooks/use-export-requirement-document";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { RequirementDocumentExportDialog } from "../forms/requirement-document-export-dialog";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../sections/requirement-change-logs-section";
import { RequirementOpenIssuesSection } from "../sections/requirement-open-issues-section";
import { RequirementDocumentDetailSkeleton } from "./document-detail/requirement-document-detail-skeleton";
import { RequirementDocumentOverview } from "./document-detail/requirement-document-overview";
import { RequirementDocumentRequirementsTab } from "./document-detail/requirement-document-requirements-tab";
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
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId
  );
  const { sections } = useRequirementSections(projectId, documentId);
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

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="requirements">要件</TabsTrigger>
          <TabsTrigger value="issues">未決事項</TabsTrigger>
          <TabsTrigger value="approvals">承認</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <RequirementDocumentOverview
            projectId={projectId}
            documentId={documentId}
            document={document}
            canComment={canCommentRequirement(currentProjectRole)}
          />
        </TabsContent>

        <TabsContent value="requirements">
          <RequirementDocumentRequirementsTab
            projectId={projectId}
            documentId={documentId}
            canCreate={canCreateRequirement(currentProjectRole)}
            canUpdate={canUpdateRequirement(currentProjectRole)}
            canComment={canCommentRequirement(currentProjectRole)}
            canReview={canReviewRequirement(currentProjectRole)}
          />
        </TabsContent>

        <TabsContent value="issues">
          <RequirementOpenIssuesSection
            projectId={projectId}
            documentId={documentId}
            canCreate={canCreateRequirement(currentProjectRole)}
            canUpdate={canUpdateRequirement(currentProjectRole)}
            canDelete={canDeleteRequirement(currentProjectRole)}
          />
        </TabsContent>

        <TabsContent value="approvals">
          <RequirementApprovalsSection
            projectId={projectId}
            targetType="document"
            targetId={documentId}
            title="要件定義書の承認"
            canReview={canReviewRequirement(currentProjectRole)}
          />
        </TabsContent>

        <TabsContent value="history">
          <RequirementChangeLogsSection
            projectId={projectId}
            documentId={documentId}
            title="要件定義書の変更履歴"
            targetType="requirement_document"
            targetId={documentId}
          />
        </TabsContent>
      </Tabs>

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
        sections={sections}
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
