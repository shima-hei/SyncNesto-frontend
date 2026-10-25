"use client";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";

import { useState } from "react";
import Link from "next/link";
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { ArtifactReleaseLink } from "@/features/artifact-releases/components/artifact-release-link";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateRequirement,
  canCommentRequirement,
  canDeleteRequirement,
  canReviewRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import type { RequirementDocumentExportRead } from "@/lib/api/generated/model";

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
import { useSectionEdits } from "../../hooks/use-section-edits";
import { SectionEditNotice } from "./document-detail/section-edit-notice";
import { RequirementDocumentFullPreview } from "./document-detail/requirement-document-full-preview";
import { useFullPreviewNavigation } from "../../hooks/use-full-preview-navigation";

type RequirementDocumentDetailPageProps = {
  projectId: number;
  documentId: number;
};

const REQUIREMENT_DOCUMENT_TABS = [
  "overview",
  "requirements",
  "preview",
  "issues",
  "approvals",
  "history",
] as const;

export function RequirementDocumentDetailPage({
  projectId,
  documentId,
}: RequirementDocumentDetailPageProps) {
  const { unsaved } = useSectionEdits(projectId, documentId);
  const [activeTab, setActiveTab] = useUrlTabState({
    values: REQUIREMENT_DOCUMENT_TABS,
    defaultValue: "overview",
  });
  const {
    editorRef,
    capture: capturePreviewReturn,
    resume: resumeFromPreview,
  } = useFullPreviewNavigation(activeTab);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPreview, setExportPreview] =
    useState<RequirementDocumentExportRead | null>(null);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId,
  );
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId,
  );
  const [selectedSectionQuery, setSelectedSectionId] = useUrlFilterState<
    number | null
  >("sectionId", null);
  const selectedSectionId = sections.some(
    (section) => section.id === selectedSectionQuery,
  )
    ? selectedSectionQuery
    : null;
  const createRequirementPath = selectedSectionId
    ? `/projects/joined/${projectId}/requirements/${documentId}/items/new?sectionId=${selectedSectionId}`
    : `/projects/joined/${projectId}/requirements/${documentId}/items/new`;
  const { deleteRequirementDocument, isPending: isDeletePending } =
    useDeleteRequirementDocument(projectId, documentId);
  const { exportRequirementDocument, isPending: isExportPending } =
    useExportRequirementDocument(projectId, documentId);

  if (isLoading) {
    return <RequirementDocumentDetailSkeleton />;
  }

  if (error || !document) {
    return (
      <div className="text-sm text-muted-foreground">
        要件定義書を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={document.title}
        description={document.document_code}
        actions={
          <>
            <ArtifactReleaseLink
              projectId={projectId}
              kind="requirement_document"
              sourceId={documentId}
              version={document.version}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isExportPending || unsaved.length > 0}
              title={
                unsaved.length
                  ? "章本文を保存してから出力してください"
                  : undefined
              }
              onClick={() => setExportDialogOpen(true)}
            >
              <DownloadIcon data-icon="inline-start" />
              出力
            </Button>
            {canCreateRequirement(currentProjectRole) && !isSectionsLoading ? (
              <Button
                asChild
                variant={activeTab === "requirements" ? "outline" : "default"}
              >
                <Link href={createRequirementPath}>要件を追加</Link>
              </Button>
            ) : null}
            {canUpdateRequirement(currentProjectRole) ? (
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/requirements/${documentId}/edit`}
                >
                  <EditIcon data-icon="inline-start" />
                  定義書の情報を編集
                </Link>
              </Button>
            ) : null}
            {canDeleteRequirement(currentProjectRole) ? (
              <Button
                type="button"
                variant="destructive"
                disabled={unsaved.length > 0}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                削除
              </Button>
            ) : null}
          </>
        }
      />

      <SectionEditNotice projectId={projectId} documentId={documentId} />
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "preview") capturePreviewReturn();
          setActiveTab(value);
        }}
        className="gap-4"
      >
        <TabsList
          variant="line"
          className="w-full min-h-12 justify-start overflow-x-auto border-b group-data-horizontal/tabs:h-auto"
        >
          <TabsTrigger className="flex-none px-4 py-2" value="overview">
            文書として読む
          </TabsTrigger>
          <TabsTrigger className="flex-none px-4 py-2" value="requirements">
            要件を書く・整理する
          </TabsTrigger>
          <TabsTrigger
            className="flex-none px-4 py-2"
            value="preview"
            data-full-preview-trigger
          >
            全文プレビュー
          </TabsTrigger>
          <TabsTrigger className="flex-none px-4 py-2" value="issues">
            未決事項
          </TabsTrigger>
          <TabsTrigger className="flex-none px-4 py-2" value="approvals">
            承認
          </TabsTrigger>
          <TabsTrigger className="flex-none px-4 py-2" value="history">
            履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <RequirementDocumentOverview
            projectId={projectId}
            documentId={documentId}
            document={document}
            canComment={canCommentRequirement(currentProjectRole)}
          />
        </TabsContent>

        <TabsContent
          value="requirements"
          forceMount={
            activeTab === "requirements" || activeTab === "preview"
              ? true
              : undefined
          }
          className="data-[state=inactive]:hidden"
        >
          <div ref={editorRef}>
            <RequirementDocumentRequirementsTab
              projectId={projectId}
              documentId={documentId}
              selectedSectionId={selectedSectionId}
              onSelectSection={(sectionId) => setSelectedSectionId(sectionId)}
              canCreate={canCreateRequirement(currentProjectRole)}
              canUpdate={canUpdateRequirement(currentProjectRole)}
              canComment={canCommentRequirement(currentProjectRole)}
              canReview={canReviewRequirement(currentProjectRole)}
            />
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <RequirementDocumentFullPreview
            projectId={projectId}
            document={document}
            onReturn={resumeFromPreview}
          />
        </TabsContent>

        <TabsContent value="issues">
          <RequirementOpenIssuesSection
            canComment={canCommentRequirement(currentProjectRole)}
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
        description="削除すると配下の要件も利用できなくなります。保持期限内はごみ箱から復元できます。"
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
