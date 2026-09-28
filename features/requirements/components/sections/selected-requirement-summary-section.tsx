"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";

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
};

export function SelectedRequirementSummarySection({
  projectId,
  documentId,
  requirementId,
}: SelectedRequirementSummarySectionProps) {
  if (!requirementId) {
    return null;
  }

  return (
    <SelectedRequirementSummaryContent
      projectId={projectId}
      documentId={documentId}
      requirementId={requirementId}
    />
  );
}

function SelectedRequirementSummaryContent({
  projectId,
  documentId,
  requirementId,
}: {
  projectId: number;
  documentId: number;
  requirementId: number;
}) {
  const { summary, isLoading } = useRequirementSummary(
    projectId,
    requirementId,
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
        </div>
        <details>
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
              label="担当者ID"
              value={requirement.owner_id ? String(requirement.owner_id) : "-"}
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
        <Button asChild variant="outline">
          <Link
            href={`/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}`}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            詳細を開く
          </Link>
        </Button>
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
        {value}
      </span>
    </div>
  );
}
