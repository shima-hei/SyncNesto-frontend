"use client";

import { useState } from "react";
import Link from "next/link";
import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
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
import { RequirementCommentsSection } from "../shared/requirement-comments-section";
import { RequirementDetailsSection } from "../shared/requirement-details-section";
import { RequirementLinksSection } from "../shared/requirement-links-section";
import { RequirementReviewsSection } from "../shared/requirement-reviews-section";
import { RequirementRevisionsSection } from "../shared/requirement-revisions-section";

type RequirementDetailPageProps = {
  projectId: number;
  documentId: number;
  requirementId: number;
};

export function RequirementDetailPage({
  projectId,
  documentId,
  requirementId,
}: RequirementDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { summary, isLoading, error } = useRequirementSummary(
    projectId,
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

      <Card>
        <CardHeader>
          <CardTitle>概要</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <RequirementInfo
            label="種別"
            value={getRequirementTypeLabel(requirement.requirement_type)}
          />
          <RequirementInfo label="カテゴリ" value={requirement.category ?? "-"} />
          <RequirementInfo
            label="優先度"
            value={getRequirementPriorityLabel(requirement.priority)}
          />
          <RequirementInfo
            label="ステータス"
            value={getRequirementStatusLabel(requirement.status)}
          />
          <RequirementInfo label="担当者ID" value={formatOptionalId(requirement.owner_id)} />
          <RequirementInfo label="更新日時" value={formatDateTime(requirement.updated_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本文</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RequirementInfo label="説明" value={requirement.description ?? "-"} />
          <RequirementInfo label="理由" value={requirement.rationale ?? "-"} />
          <RequirementInfo
            label="受け入れ条件"
            value={requirement.acceptance_criteria ?? "-"}
          />
          <RequirementInfo label="情報源" value={requirement.source ?? "-"} />
        </CardContent>
      </Card>

      {/* 詳細JSONは要件種別ごとの差分項目を保持するため、まずは読み取り専用で表示する。 */}
      <RequirementDetailsSection details={summary.details} />

      {/* コメント、リンク、レビュー、改訂履歴は要件のトレーサビリティ確認に使う。 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <RequirementLinksSection
          projectId={projectId}
          requirementId={requirementId}
          canLink={canLinkRequirement(currentProjectRole)}
        />
        <RequirementCommentsSection
          projectId={projectId}
          requirementId={requirementId}
          canComment={canCommentRequirement(currentProjectRole)}
        />
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

function RequirementInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm">{value}</span>
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
