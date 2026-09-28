"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CopyIcon,
  EditIcon,
  MessageSquarePlusIcon,
  Trash2Icon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementRelatedTasksSection } from "@/features/tasks/components/sections/requirement-related-tasks-section";
import {
  canCreateTask,
  canCreateRequirement,
  canDeleteRequirement,
  canCommentRequirement,
  canLinkRequirement,
  canReviewRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { formatDateTime } from "@/lib/format/date";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";

import {
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../constants/requirement-options";
import { useDeleteRequirement } from "../../hooks/use-delete-requirement";
import { useRequirementSummary } from "../../hooks/use-requirement-summary";
import { useTargetComments } from "../../hooks/use-target-comments";
import {
  createRequirementFieldCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import {
  evaluateRequirementReviewAnchor,
  isRequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../sections/requirement-change-logs-section";
import { RequirementDetailsSection } from "../sections/requirement-details-section";
import { RequirementLinksSection } from "../sections/requirement-links-section";
import { RequirementRelationsSection } from "../sections/requirement-relations-section";
import { RequirementReviewsSection } from "../sections/requirement-reviews-section";
import { RequirementRevisionsSection } from "../sections/requirement-revisions-section";
import { RequirementTargetCommentsSection } from "../sections/requirement-target-comments-section";
import { RequirementTestItemsSection } from "../sections/requirement-test-items-section";

type RequirementDetailPageProps = {
  projectId: number;
  documentId: number;
  requirementId: number;
};

type RequirementReviewFieldAnchor = {
  field: string;
  quote?: string;
  start_offset?: number;
  end_offset?: number;
};

export function RequirementDetailPage({
  projectId,
  documentId,
  requirementId,
}: RequirementDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useState<RequirementCommentAnchor | null>(null);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { summary, isLoading, error } = useRequirementSummary(
    projectId,
    requirementId,
  );
  const { comments: targetComments } = useTargetComments(
    projectId,
    "requirement_item",
    requirementId,
  );
  const { deleteRequirement, isPending: isDeletePending } =
    useDeleteRequirement(projectId, documentId, requirementId);

  if (isLoading) {
    return <RequirementDetailSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className="text-sm text-muted-foreground">
        要件を取得できませんでした。
      </div>
    );
  }

  const { requirement } = summary;
  const fieldTargetAnchors = targetComments
    .map((comment) => comment.target_anchor)
    .filter(isRequirementReviewFieldAnchor);

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    const anchorKey = getRequirementCommentAnchorKey(targetAnchor);
    const selector = anchorKey
      ? `[data-requirement-comment-anchor="${CSS.escape(anchorKey)}"]`
      : isRequirementReviewFieldAnchor(targetAnchor)
        ? `[data-requirement-anchor-field="${CSS.escape(targetAnchor.field)}"]`
        : null;

    if (!selector) {
      return;
    }

    const element = document.querySelector(selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return null;
    }

    return evaluateRequirementReviewAnchor(
      targetAnchor,
      getRequirementAnchorFieldValue(requirement, targetAnchor.field),
      requirement.version,
    );
  };

  return (
    <div className="@container/requirement-detail flex min-w-0 flex-col gap-6">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link
          href={`/projects/joined/${projectId}/requirements/${documentId}?tab=requirements`}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          要件タブへ戻る
        </Link>
      </Button>
      <PageHeader
        title={requirement.title}
        description={requirement.requirement_code}
        actions={
          <>
            {canCreateRequirement(currentProjectRole) ? (
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/requirements/${documentId}/items/new?duplicateFrom=${requirementId}`}
                >
                  <CopyIcon data-icon="inline-start" />
                  複製
                </Link>
              </Button>
            ) : null}
            {canUpdateRequirement(currentProjectRole) ? (
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}/edit`}
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
          </>
        }
      />

      <div className="grid gap-4 @min-[64rem]/requirement-detail:grid-cols-[minmax(0,1fr)_20rem] @min-[64rem]/requirement-detail:items-start @min-[80rem]/requirement-detail:grid-cols-[minmax(0,1fr)_24rem]">
        <Tabs defaultValue="overview" className="min-w-0 gap-4">
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto border-b"
          >
            <TabsTrigger className="flex-none px-4 py-2" value="overview">
              概要
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="details">
              実現内容
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="relations">
              関連
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="reviews">
              レビュー
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="approvals">
              承認
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="history">
              履歴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>概要</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <RequirementInfo
                  label="種別"
                  value={getRequirementTypeLabel(requirement.requirement_type)}
                  field="requirement_type"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="カテゴリ"
                  value={requirement.category ?? "-"}
                />
                <RequirementInfo
                  label="優先度"
                  value={getRequirementPriorityLabel(requirement.priority)}
                  field="priority"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="ステータス"
                  value={getRequirementStatusLabel(requirement.status)}
                  field="status"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="担当者"
                  value={
                    requirement.owner?.name ??
                    (requirement.owner_id ? "担当者情報なし" : "未設定")
                  }
                />
                <RequirementInfo
                  label="更新日時"
                  value={formatDateTime(requirement.updated_at)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>本文</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <RequirementInfo
                  label="説明"
                  value={requirement.description ?? "-"}
                  field="description"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="理由"
                  value={requirement.rationale ?? "-"}
                  field="rationale"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="受け入れ条件"
                  value={requirement.acceptance_criteria ?? "-"}
                  field="acceptance_criteria"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
                <RequirementInfo
                  label="情報源"
                  value={requirement.source ?? "-"}
                  field="source"
                  targetAnchors={fieldTargetAnchors}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <RequirementDetailsSection
              projectId={projectId}
              requirementId={requirementId}
              details={summary.details}
              canUpdate={canUpdateRequirement(currentProjectRole)}
              onSelectCommentAnchor={setSelectedTargetAnchor}
            />
          </TabsContent>

          <TabsContent value="relations">
            <div className="grid gap-4">
              <div>
                <RequirementTestItemsSection
                  projectId={projectId}
                  requirementId={requirementId}
                />
              </div>
              <div>
                <RequirementRelatedTasksSection
                  projectId={projectId}
                  requirementId={requirementId}
                  canCreate={canCreateTask(currentProjectRole)}
                  onSelectCommentAnchor={setSelectedTargetAnchor}
                />
              </div>
              <RequirementLinksSection
                projectId={projectId}
                requirementId={requirementId}
                canLink={canLinkRequirement(currentProjectRole)}
                onSelectCommentAnchor={setSelectedTargetAnchor}
              />
              <RequirementRelationsSection
                projectId={projectId}
                documentId={documentId}
                currentSectionId={requirement.section_id}
                requirementId={requirementId}
                canLink={canLinkRequirement(currentProjectRole)}
                onSelectCommentAnchor={setSelectedTargetAnchor}
              />
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid gap-4">
              <RequirementReviewsSection
                projectId={projectId}
                requirementId={requirementId}
                canReview={canReviewRequirement(currentProjectRole)}
              />
              <RequirementRevisionsSection
                projectId={projectId}
                requirementId={requirementId}
              />
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <RequirementApprovalsSection
              projectId={projectId}
              targetType="requirement_item"
              targetId={requirementId}
              title="要件の承認"
              canReview={canReviewRequirement(currentProjectRole)}
            />
          </TabsContent>

          <TabsContent value="history">
            <RequirementChangeLogsSection
              projectId={projectId}
              documentId={documentId}
              title="要件の変更履歴"
              targetType="requirement"
              targetId={requirementId}
            />
          </TabsContent>
        </Tabs>

        <aside className="min-w-0 @min-[64rem]/requirement-detail:sticky @min-[64rem]/requirement-detail:top-20">
          <RequirementTargetCommentsSection
            projectId={projectId}
            targetType="requirement_item"
            targetId={requirementId}
            title="コメント"
            canComment={canCommentRequirement(currentProjectRole)}
            selectedTargetAnchor={selectedTargetAnchor}
            onTargetAnchorClick={handleTargetAnchorClick}
            getTargetAnchorStatus={getTargetAnchorStatus}
            showTargetAnchorInput={false}
            className="@min-[64rem]/requirement-detail:max-h-[calc(100dvh-6rem)] @min-[64rem]/requirement-detail:overflow-hidden"
            contentClassName="@min-[64rem]/requirement-detail:min-h-0 @min-[64rem]/requirement-detail:overflow-y-auto @min-[64rem]/requirement-detail:overscroll-contain"
          />
        </aside>
      </div>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="要件"
        description="削除すると元に戻せません。関連する実現内容、コメント、レビューも利用できなくなります。"
        isPending={isDeletePending}
        onConfirm={deleteRequirement}
      />
    </div>
  );
}

function RequirementInfo({
  label,
  value,
  field,
  targetAnchors = [],
  onSelectTargetAnchor,
}: {
  label: string;
  value: string;
  field?: string;
  targetAnchors?: RequirementReviewFieldAnchor[];
  onSelectTargetAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
}) {
  const fieldAnchors = field
    ? targetAnchors.filter((targetAnchor) => targetAnchor.field === field)
    : [];
  const anchorKey = field
    ? getRequirementCommentAnchorKey(
        createRequirementFieldCommentAnchor(field, label),
      )
    : null;

  return (
    <div
      className="flex flex-col gap-1 scroll-mt-24"
      data-requirement-anchor-field={field}
      data-requirement-comment-anchor={anchorKey ?? undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {field && onSelectTargetAnchor ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() =>
              onSelectTargetAnchor(
                createRequirementFieldCommentAnchor(field, label),
              )
            }
          >
            <MessageSquarePlusIcon data-icon="inline-start" />
            コメント
          </Button>
        ) : null}
      </div>
      <span className="whitespace-pre-wrap text-sm">
        {renderHighlightedValue(value, fieldAnchors)}
      </span>
    </div>
  );
}

function RequirementDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const isRequirementTargetAnchor = (
  value: Record<string, unknown> | null | undefined,
): value is RequirementReviewFieldAnchor => {
  return Boolean(value && typeof value.field === "string");
};

const isRequirementReviewFieldAnchor = isRequirementTargetAnchor;

const renderHighlightedValue = (
  value: string,
  targetAnchors: RequirementReviewFieldAnchor[],
) => {
  const quote = targetAnchors
    .map((targetAnchor) => targetAnchor.quote)
    .find((item): item is string => Boolean(item && value.includes(item)));

  if (!quote) {
    return value;
  }
  const [before, after] = value.split(quote, 2);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-yellow-200 px-0.5 text-foreground">
        {quote}
      </mark>
      {after}
    </>
  );
};

const getRequirementAnchorFieldValue = (
  requirement: {
    requirement_code: string;
    requirement_type: string;
    title: string;
    description?: string | null;
    rationale?: string | null;
    acceptance_criteria?: string | null;
    priority?: string | null;
    status?: string | null;
    source?: string | null;
  },
  field: string,
) => {
  switch (field) {
    case "requirement_code":
      return requirement.requirement_code;
    case "title":
      return requirement.title;
    case "description":
      return requirement.description ?? "";
    case "rationale":
      return requirement.rationale ?? "";
    case "acceptance_criteria":
      return requirement.acceptance_criteria ?? "";
    case "source":
      return requirement.source ?? "";
    case "requirement_type":
      return getRequirementTypeLabel(requirement.requirement_type);
    case "priority":
      return getRequirementPriorityLabel(requirement.priority);
    case "status":
      return getRequirementStatusLabel(requirement.status);
    default:
      return "";
  }
};
