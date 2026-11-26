"use client";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { requirementListHref } from "../../lib/requirement-entry";
import { useProjectObjectives } from "@/features/projects/hooks/use-project-objectives";

import { useState } from "react";
import Link from "next/link";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  DownloadIcon,
  EditIcon,
  EllipsisIcon,
  FileTextIcon,
  Trash2Icon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { requirementPublicationHref } from "@/features/artifact-publications/lib/requirement-publication-navigation";
import { artifactReleasesHref } from "@/features/artifact-releases/lib/navigation";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canApproveRequirement,
  canCreateRequirement,
  canCommentRequirement,
  canDeleteRequirement,
  canReviewRequirement,
  canUpdateRequirement,
  canViewRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import type { RequirementDocumentExportRead } from "@/lib/api/generated/model";

import { useDeleteRequirementDocument } from "../../hooks/use-delete-requirement-document";
import { useExportRequirementDocument } from "../../hooks/use-export-requirement-document";
import { useRequirementReviewManagement } from "../../hooks/use-requirement-review-management";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { RequirementDocumentExportDialog } from "../forms/requirement-document-export-dialog";
import { RequirementReviewRequestDialog } from "../forms/requirement-review-request-dialog";
import { RequirementFormalApprovalDialog } from "../forms/requirement-formal-approval-dialog";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementOpenIssuesSection } from "../sections/requirement-open-issues-section";
import { RequirementDocumentDetailSkeleton } from "./document-detail/requirement-document-detail-skeleton";
import { RequirementDocumentOverview } from "./document-detail/requirement-document-overview";
import { RequirementDocumentRequirementsTab } from "./document-detail/requirement-document-requirements-tab";
import { RequirementReviewManagement } from "./document-detail/requirement-review-management";
import { RequirementDocumentHistory } from "./document-detail/requirement-document-history";
import { useSectionEdits } from "../../hooks/use-section-edits";
import { SectionEditNotice } from "./document-detail/section-edit-notice";
import { RequirementDocumentFullPreview } from "./document-detail/requirement-document-full-preview";
import { useFullPreviewNavigation } from "../../hooks/use-full-preview-navigation";
import { RequirementWorkbenchProvider } from "../../hooks/use-workbench-state";
import { useWorkbenchReturnNavigation } from "../../hooks/use-workbench-return-navigation";
import { getRequirementDocumentStatusLabel } from "../../constants/requirement-options";
import { UNCLASSIFIED_SECTION_ID } from "../../constants/requirement-view-options";
import { formatDateTime } from "@/lib/format/date";
import { StatusIndicator } from "@/components/shared/display/status-badge";

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
  return (
    <RequirementWorkbenchProvider projectId={projectId} documentId={documentId}>
      <RequirementDocumentDetailContent
        projectId={projectId}
        documentId={documentId}
      />
    </RequirementWorkbenchProvider>
  );
}

function RequirementDocumentDetailContent({
  projectId,
  documentId,
}: RequirementDocumentDetailPageProps) {
  const { unsaved } = useSectionEdits(projectId, documentId);
  const objectivesQuery = useProjectObjectives(projectId);
  const { returnTo: listReturn } = useListNavigation(
    requirementListHref(projectId),
  );
  const listHref = requirementListHref(projectId, listReturn);
  const [activeTab, setActiveTab] = useUrlTabState({
    values: REQUIREMENT_DOCUMENT_TABS,
    defaultValue: "overview",
  });
  const {
    editorRef,
    capture: capturePreviewReturn,
    resume: resumeFromPreview,
  } = useFullPreviewNavigation(activeTab);
  const returnNotice = useWorkbenchReturnNavigation(editorRef, activeTab);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPreview, setExportPreview] =
    useState<RequirementDocumentExportRead | null>(null);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { user } = useAuth();
  const internal = user?.user_type === "internal" && !user.demo;
  const { document, isLoading, error } = useRequirementDocument(
    projectId,
    documentId,
  );
  const reviewManagement = useRequirementReviewManagement(
    projectId,
    documentId,
    {
      enabled: Boolean(
        internal && document && canViewRequirement(currentProjectRole),
      ),
    },
  );
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId,
  );
  const [sectionFilter, setSectionFilter] = useUrlFilterState("sectionId", "");
  const sectionNumber = Number(sectionFilter);
  const selectedSectionId =
    sectionFilter === "unclassified"
      ? UNCLASSIFIED_SECTION_ID
      : (sections.find((section) => section.id === sectionNumber)?.id ?? null);
  const [, setRequirementPage] = useUrlFilterState("page", 1);
  const { deleteRequirementDocument, isPending: isDeletePending } =
    useDeleteRequirementDocument(projectId, documentId);
  const { exportRequirementDocument, isPending: isExportPending } =
    useExportRequirementDocument(projectId, documentId);
  const visibleTab =
    activeTab === "preview"
      ? "overview"
      : activeTab === "issues"
        ? "approvals"
        : activeTab;
  const openFullPreview = () => {
    capturePreviewReturn();
    setActiveTab("preview");
  };
  const issuePermissions = {
    canComment: canCommentRequirement(currentProjectRole),
    canCreate: canCreateRequirement(currentProjectRole),
    canUpdate: canUpdateRequirement(currentProjectRole),
    canDelete: canDeleteRequirement(currentProjectRole),
  };

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

  const management = reviewManagement.data;
  const workflowStatus =
    management?.formal_approval?.status === "requested"
      ? "正式承認待ち"
      : management?.active_review_count
        ? "レビュー中"
        : management?.formal_approval?.status === "returned"
          ? "差し戻し"
          : management?.formal_approval?.status === "approved"
            ? "承認済み版あり"
            : document.status === "draft"
              ? "編集中"
              : document.status &&
                getRequirementDocumentStatusLabel(document.status);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        href={listHref}
        className="inline-flex min-h-8 w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        要件定義書
      </Link>
      <PageHeader
        title={document.title}
        metadata={
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {document.document_code}
            {workflowStatus ? (
              <StatusIndicator
                tone={
                  workflowStatus === "レビュー中" ||
                  workflowStatus === "正式承認待ち"
                    ? "info"
                    : workflowStatus === "差し戻し"
                      ? "danger"
                      : workflowStatus === "承認済み版あり"
                        ? "success"
                        : "neutral"
                }
              >
                {workflowStatus}
              </StatusIndicator>
            ) : null}
            <time dateTime={document.updated_at}>
              更新 {formatDateTime(document.updated_at)}
            </time>
          </div>
        }
        actions={
          <>
            {internal &&
            canReviewRequirement(currentProjectRole) &&
            canUpdateRequirement(currentProjectRole) ? (
              <>
                <RequirementReviewRequestDialog
                  projectId={projectId}
                  documentId={documentId}
                  documentVersion={document.version}
                  sections={sections}
                  externalHref={requirementPublicationHref(
                    projectId,
                    documentId,
                    document.version,
                  )}
                  disabled={isSectionsLoading || unsaved.length > 0}
                  onRequested={() => setActiveTab("approvals")}
                />
                <RequirementFormalApprovalDialog
                  projectId={projectId}
                  documentId={documentId}
                  documentVersion={document.version}
                  externalHref={requirementPublicationHref(
                    projectId,
                    documentId,
                    document.version,
                  )}
                  disabled={isSectionsLoading || unsaved.length > 0}
                  canRecordException={canApproveRequirement(currentProjectRole)}
                  onRequested={() => setActiveTab("approvals")}
                />
              </>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="定義書のその他の操作"
                >
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onSelect={openFullPreview}>
                  <FileTextIcon />
                  全文プレビュー
                </DropdownMenuItem>
                {internal && canReviewRequirement(currentProjectRole) ? (
                  <DropdownMenuItem asChild disabled={unsaved.length > 0}>
                    <Link
                      href={artifactReleasesHref(
                        projectId,
                        "requirement_document",
                        documentId,
                        document.version,
                        `/projects/joined/${projectId}/requirements/${documentId}?tab=history`,
                      )}
                    >
                      <ArchiveIcon />
                      バージョン履歴・添付資料
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  disabled={isExportPending || unsaved.length > 0}
                  onSelect={() => setExportDialogOpen(true)}
                >
                  <DownloadIcon />
                  出力
                </DropdownMenuItem>
                {canUpdateRequirement(currentProjectRole) ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/projects/joined/${projectId}/requirements/${documentId}/edit`}
                    >
                      <EditIcon />
                      定義書の情報を編集
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {canDeleteRequirement(currentProjectRole) ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={unsaved.length > 0}
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2Icon />
                      削除
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <SectionEditNotice projectId={projectId} documentId={documentId} />
      {returnNotice ? (
        <p role="status" className="text-sm text-muted-foreground">
          {returnNotice}
        </p>
      ) : null}
      <Tabs
        value={visibleTab}
        activationMode="manual"
        onValueChange={setActiveTab}
        className="min-w-0 gap-4"
      >
        <TabsList
          variant="line"
          aria-label="要件定義書の表示"
          className="w-full min-h-12 justify-start overflow-x-auto border-b group-data-horizontal/tabs:h-auto"
        >
          <TabsTrigger
            className="flex-none px-3 py-2"
            value="overview"
            data-full-preview-trigger
          >
            本文
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3 py-2" value="requirements">
            要件一覧
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3 py-2" value="approvals">
            レビュー・合意
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3 py-2" value="history">
            履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {activeTab === "preview" ? (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => setActiveTab("overview")}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                本文に戻る
              </Button>
              <RequirementDocumentFullPreview
                projectId={projectId}
                document={document}
                onReturn={resumeFromPreview}
              />
            </div>
          ) : (
            <RequirementDocumentOverview
              projectId={projectId}
              documentId={documentId}
              document={document}
              canComment={canCommentRequirement(currentProjectRole)}
              canCreate={canCreateRequirement(currentProjectRole)}
              canUpdate={canUpdateRequirement(currentProjectRole)}
            />
          )}
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
              document={document}
              objectiveReferencesEnabled={Boolean(
                objectivesQuery.data?.enabled &&
                objectivesQuery.data.state !== "restricted",
              )}
              onOpenDocumentInfo={() => setActiveTab("overview")}
              projectId={projectId}
              documentId={documentId}
              selectedSectionId={selectedSectionId}
              onSelectSection={(sectionId) => {
                setRequirementPage(1);
                setSectionFilter(
                  sectionId === UNCLASSIFIED_SECTION_ID
                    ? "unclassified"
                    : (sectionId?.toString() ?? ""),
                );
              }}
              canCreate={canCreateRequirement(currentProjectRole)}
              canUpdate={canUpdateRequirement(currentProjectRole)}
              canComment={canCommentRequirement(currentProjectRole)}
              canReview={canReviewRequirement(currentProjectRole)}
            />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="flex flex-col gap-4">
          {internal ? (
            <RequirementReviewManagement
              projectId={projectId}
              documentId={documentId}
              {...issuePermissions}
            />
          ) : (
            <RequirementOpenIssuesSection
              projectId={projectId}
              documentId={documentId}
              {...issuePermissions}
            />
          )}
          <details className="rounded-md border px-4 py-3">
            <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
              従来の承認
            </summary>
            <div className="pt-3">
              <RequirementApprovalsSection
                projectId={projectId}
                targetType="document"
                targetId={documentId}
                title="要件定義書の従来承認"
                canReview={canReviewRequirement(currentProjectRole)}
              />
            </div>
          </details>
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-4">
          <RequirementDocumentHistory
            projectId={projectId}
            document={document}
            internal={Boolean(internal)}
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
