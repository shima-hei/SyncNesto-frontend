"use client";

import { useState } from "react";
import Link from "next/link";
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RequirementDocumentRead,
} from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  getRequirementDocumentStatusLabel,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../constants/requirement-options";
import { useDeleteRequirementDocument } from "../../hooks/use-delete-requirement-document";
import { useExportRequirementDocument } from "../../hooks/use-export-requirement-document";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useRequirements } from "../../hooks/use-requirements";
import { RequirementDocumentExportDialog } from "../forms/requirement-document-export-dialog";
import { MarkdownPreview } from "../forms/markdown-textarea";
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
          <div className="grid gap-4 2xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(280px,360px)] 2xl:items-start">
            <div className="min-w-0 2xl:sticky 2xl:top-20">
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
                canUpdate={canUpdateRequirement(currentProjectRole)}
                onDeleted={() => setSelectedSectionId(null)}
              />
              <RequirementsListSection
                projectId={projectId}
                documentId={documentId}
                sectionId={selectedSectionId}
                canCreate={canCreateRequirement(currentProjectRole)}
                canUpdate={canUpdateRequirement(currentProjectRole)}
                selectedRequirementId={selectedRequirementId}
                onSelectRequirement={setSelectedRequirementId}
              />
            </div>

            <div className="min-w-0 2xl:sticky 2xl:top-20">
              {selectedRequirementId ? (
                <SelectedRequirementSummarySection
                  projectId={projectId}
                  documentId={documentId}
                  requirementId={selectedRequirementId}
                />
              ) : selectedSectionId ? (
                <SelectedSectionSupportTabs
                  projectId={projectId}
                  documentId={documentId}
                  sectionId={selectedSectionId}
                  canComment={canCommentRequirement(currentProjectRole)}
                  canReview={canReviewRequirement(currentProjectRole)}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>選択中の情報</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      セクションまたは要件を選択すると、関連情報を確認できます。
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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

function RequirementDocumentOverview({
  projectId,
  documentId,
  document,
  canComment,
}: {
  projectId: number;
  documentId: number;
  document: RequirementDocumentRead;
  canComment: boolean;
}) {
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId
  );
  const { requirements, isLoading: isRequirementsLoading } = useRequirements(
    projectId,
    {
      page: 1,
      page_size: 100,
      document_id: documentId,
    }
  );
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const unassignedRequirements = requirements.filter(
    (requirement) => !requirement.section_id
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DocumentInfo
            label="ステータス"
            value={
              document.status
                ? getRequirementDocumentStatusLabel(document.status)
                : "-"
            }
          />
          <DocumentInfo
            label="対象システム"
            value={document.target_system_name ?? "-"}
          />
          <DocumentInfo label="クライアント" value={document.client_name ?? "-"} />
          <DocumentInfo label="ベンダー" value={document.vendor_name ?? "-"} />
          <DocumentInfo
            label="更新日時"
            value={formatDateTime(document.updated_at)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>要件定義書プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            {isSectionsLoading || isRequirementsLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <article className="mx-auto flex max-w-4xl flex-col gap-8 rounded-lg border bg-background px-6 py-8 md:px-10">
                <header className="flex flex-col gap-4 border-b pb-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {document.document_code}
                    </p>
                    <h1 className="text-2xl font-semibold tracking-normal">
                      {document.title}
                    </h1>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                    <DocumentMeta
                      label="ステータス"
                      value={
                        document.status
                          ? getRequirementDocumentStatusLabel(document.status)
                          : "-"
                      }
                    />
                    <DocumentMeta
                      label="対象システム"
                      value={document.target_system_name ?? "-"}
                    />
                    <DocumentMeta
                      label="クライアント"
                      value={document.client_name ?? "-"}
                    />
                    <DocumentMeta
                      label="ベンダー"
                      value={document.vendor_name ?? "-"}
                    />
                    <DocumentMeta
                      label="更新日時"
                      value={formatDateTime(document.updated_at)}
                    />
                  </dl>
                </header>

                <section className="flex flex-col gap-3">
                  <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
                    目的
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {document.purpose || "目的は未設定です。"}
                  </p>
                </section>

                {sortedSections.map((section) => (
                  <DocumentPreviewSection
                    key={section.id}
                    title={section.title}
                    content={section.content ?? ""}
                    requirements={requirements.filter(
                      (requirement) => requirement.section_id === section.id
                    )}
                  />
                ))}
                {unassignedRequirements.length ? (
                  <DocumentPreviewSection
                    title="セクション未設定"
                    content=""
                    requirements={unassignedRequirements}
                  />
                ) : null}
                {!sortedSections.length && !unassignedRequirements.length ? (
                  <p className="text-sm text-muted-foreground">
                    プレビューするセクションまたは要件はありません。
                  </p>
                ) : null}
              </article>
            )}
          </CardContent>
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-20">
          <RequirementTargetCommentsSection
            projectId={projectId}
            targetType="document"
            targetId={documentId}
            title="要件定義書コメント"
            canComment={canComment}
            className="xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden"
            contentClassName="xl:min-h-0 xl:overflow-y-auto"
          />
        </aside>
      </div>
    </div>
  );
}

type DocumentPreviewSectionProps = {
  title: string;
  content: string;
  requirements: {
    id: number;
    requirement_code: string;
    title: string;
    requirement_type?: string | null;
    priority?: string | null;
    status?: string | null;
  }[];
};

function DocumentPreviewSection({
  title,
  content,
  requirements,
}: DocumentPreviewSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
        {title}
      </h2>
      {content.trim() ? (
        <MarkdownPreview
          value={content}
          emptyMessage="本文はありません。"
          className="min-h-0 border-0 bg-transparent p-0"
        />
      ) : null}
      {requirements.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>要件ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell className="font-medium">
                    {requirement.requirement_code}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {requirement.title}
                  </TableCell>
                  <TableCell>
                    {getRequirementTypeLabel(requirement.requirement_type)}
                  </TableCell>
                  <TableCell>
                    {getRequirementPriorityLabel(requirement.priority)}
                  </TableCell>
                  <TableCell>
                    {getRequirementStatusLabel(requirement.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : content.trim() ? null : (
        <p className="text-sm text-muted-foreground">
          本文と要件はありません。
        </p>
      )}
    </section>
  );
}

function DocumentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function SelectedSectionSupportTabs({
  projectId,
  documentId,
  sectionId,
  canComment,
  canReview,
}: {
  projectId: number;
  documentId: number;
  sectionId: number;
  canComment: boolean;
  canReview: boolean;
}) {
  return (
    <Tabs defaultValue="comments" className="gap-3">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="comments">コメント</TabsTrigger>
        <TabsTrigger value="approvals">承認</TabsTrigger>
        <TabsTrigger value="history">履歴</TabsTrigger>
      </TabsList>

      <TabsContent value="comments">
        <RequirementTargetCommentsSection
          projectId={projectId}
          targetType="section"
          targetId={sectionId}
          title="セクションコメント"
          canComment={canComment}
        />
      </TabsContent>

      <TabsContent value="approvals">
        <RequirementApprovalsSection
          projectId={projectId}
          targetType="section"
          targetId={sectionId}
          title="セクションの承認"
          canReview={canReview}
        />
      </TabsContent>

      <TabsContent value="history">
        <RequirementChangeLogsSection
          projectId={projectId}
          documentId={documentId}
          title="セクションの変更履歴"
          targetType="requirement_section"
          targetId={sectionId}
        />
      </TabsContent>
    </Tabs>
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
