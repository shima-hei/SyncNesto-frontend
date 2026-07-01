"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyIcon, EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  evaluateRequirementReviewAnchor,
  isRequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../sections/requirement-change-logs-section";
import { RequirementCommentsSection } from "../sections/requirement-comments-section";
import { RequirementDetailsSection } from "../sections/requirement-details-section";
import { RequirementLinksSection } from "../sections/requirement-links-section";
import { RequirementRelationsSection } from "../sections/requirement-relations-section";
import { RequirementReviewsSection } from "../sections/requirement-reviews-section";
import { RequirementRevisionsSection } from "../sections/requirement-revisions-section";
import { RequirementTargetCommentsSection } from "../sections/requirement-target-comments-section";

type RequirementDetailPageProps = {
  projectId: number;
  documentId: number;
  requirementId: number;
};

type RequirementTargetAnchor = {
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
    useState<RequirementTargetAnchor | null>(null);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { summary, isLoading, error } = useRequirementSummary(
    projectId,
    requirementId
  );
  const { comments: targetComments } = useTargetComments(
    projectId,
    "requirement_item",
    requirementId
  );
  const { deleteRequirement, isPending: isDeletePending } =
    useDeleteRequirement(projectId, documentId, requirementId);

  if (isLoading) {
    return <RequirementDetailSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        要件を取得できませんでした。
      </div>
    );
  }

  const { requirement } = summary;
  const targetAnchors = targetComments
    .map((comment) => comment.target_anchor)
    .filter(isRequirementTargetAnchor);

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementTargetAnchor(targetAnchor)) {
      return;
    }
    const element = document.querySelector(
      `[data-requirement-anchor-field="${targetAnchor.field}"]`
    );

    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return null;
    }

    return evaluateRequirementReviewAnchor(
      targetAnchor,
      getRequirementAnchorFieldValue(requirement, targetAnchor.field),
      requirement.version
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-lg font-semibold">{requirement.title}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {requirement.requirement_code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="details">詳細</TabsTrigger>
          <TabsTrigger value="relations">関連</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
          <TabsTrigger value="reviews">レビュー</TabsTrigger>
          <TabsTrigger value="approvals">承認</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
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
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo label="カテゴリ" value={requirement.category ?? "-"} />
              <RequirementInfo
                label="優先度"
                value={getRequirementPriorityLabel(requirement.priority)}
                field="priority"
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo
                label="ステータス"
                value={getRequirementStatusLabel(requirement.status)}
                field="status"
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo
                label="担当者ID"
                value={formatOptionalId(requirement.owner_id)}
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
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo
                label="理由"
                value={requirement.rationale ?? "-"}
                field="rationale"
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo
                label="受け入れ条件"
                value={requirement.acceptance_criteria ?? "-"}
                field="acceptance_criteria"
                targetAnchors={targetAnchors}
                onSelectTargetAnchor={setSelectedTargetAnchor}
              />
              <RequirementInfo
                label="情報源"
                value={requirement.source ?? "-"}
                field="source"
                targetAnchors={targetAnchors}
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
          />
        </TabsContent>

        <TabsContent value="relations">
          <div className="grid gap-4 xl:grid-cols-2">
            <RequirementLinksSection
              projectId={projectId}
              requirementId={requirementId}
              canLink={canLinkRequirement(currentProjectRole)}
            />
            <RequirementRelationsSection
              projectId={projectId}
              requirementId={requirementId}
              canLink={canLinkRequirement(currentProjectRole)}
            />
            <RequirementRelatedTasksSection
              projectId={projectId}
              requirementId={requirementId}
              canCreate={canCreateTask(currentProjectRole)}
            />
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div className="grid gap-4 xl:grid-cols-2">
            <RequirementCommentsSection
              projectId={projectId}
              requirementId={requirementId}
              canComment={canCommentRequirement(currentProjectRole)}
            />
            <RequirementTargetCommentsSection
              projectId={projectId}
              targetType="requirement_item"
              targetId={requirementId}
              title="要件スレッドコメント"
              canComment={canCommentRequirement(currentProjectRole)}
              selectedTargetAnchor={selectedTargetAnchor}
              onTargetAnchorClick={handleTargetAnchorClick}
              getTargetAnchorStatus={getTargetAnchorStatus}
            />
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="grid gap-4 xl:grid-cols-2">
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

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="要件"
        description="削除すると元に戻せません。関連する詳細、コメント、レビューも利用できなくなります。"
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
  targetAnchors?: RequirementTargetAnchor[];
  onSelectTargetAnchor?: (targetAnchor: RequirementTargetAnchor) => void;
}) {
  const handleMouseUp = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!field || !onSelectTargetAnchor) {
      return;
    }
    const selection = window.getSelection();
    const quote = selection?.toString().trim();

    if (!quote || !event.currentTarget.contains(selection?.anchorNode ?? null)) {
      return;
    }
    const startOffset = value.indexOf(quote);
    onSelectTargetAnchor({
      field,
      quote,
      ...(startOffset >= 0
        ? {
            start_offset: startOffset,
            end_offset: startOffset + quote.length,
          }
        : {}),
    });
    selection?.removeAllRanges();
  };

  const fieldAnchors = field
    ? targetAnchors.filter((targetAnchor) => targetAnchor.field === field)
    : [];

  return (
    <div
      className="flex flex-col gap-1 scroll-mt-24"
      data-requirement-anchor-field={field}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm" onMouseUp={handleMouseUp}>
        {renderHighlightedValue(value, fieldAnchors)}
      </span>
    </div>
  );
}

function RequirementDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const formatOptionalId = (id?: number | null) => {
  return id ? String(id) : "-";
};

const isRequirementTargetAnchor = (
  value: Record<string, unknown> | null | undefined
): value is RequirementTargetAnchor => {
  return Boolean(value && typeof value.field === "string");
};

const renderHighlightedValue = (
  value: string,
  targetAnchors: RequirementTargetAnchor[]
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
  field: string
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
