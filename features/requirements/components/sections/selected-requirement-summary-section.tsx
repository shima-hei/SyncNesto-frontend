"use client";

import Link from "next/link";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { EditIcon, ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";
import { useWorkbenchState } from "../../hooks/use-workbench-state";
import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
} from "../shared/requirement-badges";

import {
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../constants/requirement-options";
import { useRequirementSummary } from "../../hooks/use-requirement-summary";

type SelectedRequirementSummarySectionProps = {
  projectId: number;
  documentId: number;
  requirementId: number | null;
  canUpdate: boolean;
};

export function SelectedRequirementSummarySection({
  projectId,
  documentId,
  requirementId,
  canUpdate,
}: SelectedRequirementSummarySectionProps) {
  if (!requirementId) {
    return null;
  }

  return (
    <SelectedRequirementSummaryContent
      projectId={projectId}
      documentId={documentId}
      requirementId={requirementId}
      canUpdate={canUpdate}
    />
  );
}

function SelectedRequirementSummaryContent({
  projectId,
  documentId,
  requirementId,
  canUpdate,
}: {
  projectId: number;
  documentId: number;
  requirementId: number;
  canUpdate: boolean;
}) {
  const [summaryOpen, setSummaryOpen] = useWorkbenchState(
    `summary:${requirementId}`,
    false,
  );
  const { summary, isLoading } = useRequirementSummary(
    projectId,
    requirementId,
  );
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/requirements/${documentId}?tab=requirements`,
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>選択中の要件</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            選択中の要件を取得できませんでした。
          </p>
        </CardContent>
      </Card>
    );
  }

  const { requirement } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>選択中の要件</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {requirement.requirement_code}
          </span>
          <h3 className="text-base font-semibold break-words">
            {requirement.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            <RequirementStatusBadge status={requirement.status} />
            <RequirementPriorityBadge priority={requirement.priority} />
          </div>
        </div>
        <details
          open={summaryOpen}
          onToggle={(event) => setSummaryOpen(event.currentTarget.open)}
        >
          <summary className="w-fit cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            要件の概要を表示
          </summary>
          <div className="mt-3 grid gap-3 text-sm">
            <RequirementSummaryInfo
              label="種別"
              value={getRequirementTypeLabel(requirement.requirement_type)}
            />
            <RequirementSummaryInfo
              label="優先度"
              value={getRequirementPriorityLabel(requirement.priority)}
            />
            <RequirementSummaryInfo
              label="ステータス"
              value={getRequirementStatusLabel(requirement.status)}
            />
            <RequirementSummaryInfo
              label="担当者"
              value={
                requirement.owner?.name ??
                (requirement.owner_id
                  ? `ID: ${requirement.owner_id}`
                  : "未設定")
              }
            />
            <RequirementSummaryInfo
              label="理由"
              value={requirement.rationale ?? "未設定"}
            />
            <RequirementSummaryInfo
              label="説明"
              value={requirement.description ?? "-"}
            />
            <RequirementSummaryInfo
              label="受け入れ条件"
              value={requirement.acceptance_criteria ?? "-"}
            />
            <RequirementSummaryInfo
              label="更新日時"
              value={formatDateTime(requirement.updated_at)}
            />
            <RequirementSummaryInfo
              label="関連情報"
              value={`実現内容 ${summary.details.length}件 / リンク ${summary.links.length}件 / コメント ${summary.comments.length}件 / レビュー ${summary.reviews.length}件`}
            />
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Button asChild size="sm">
              <Link
                href={withReturn(
                  `/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}/edit`,
                )}
              >
                <EditIcon data-icon="inline-start" />
                要件を編集
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link
              href={withReturn(
                `/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}`,
              )}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              詳細を開く
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequirementSummaryInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {value || "未設定"}
      </span>
    </div>
  );
}
