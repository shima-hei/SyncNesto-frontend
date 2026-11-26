"use client";

import Link from "next/link";
import { StatusIndicator } from "@/components/shared/display/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { useRequirementVerdicts } from "@/features/projects/hooks/use-requirement-verdicts";
import {
  verdictHref,
  verdictLabels,
} from "@/features/requirement-verifications/lib/verdict";

export function RequirementVerdict({
  query,
  requirementId,
  version,
  projectId,
  returnTo,
  showLinks = true,
}: {
  query: ReturnType<typeof useRequirementVerdicts>;
  requirementId: number;
  version: number;
  projectId: number;
  returnTo: string;
  showLinks?: boolean;
}) {
  if (query.data?.state === "disabled") return null;
  if (query.isPending)
    return <Skeleton className="h-8 w-28" aria-label="要件の判定を確認中" />;
  if (query.isError)
    return (
      <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>
        判定の取得を再試行
      </Button>
    );
  if (query.data?.state === "restricted")
    return <span className="text-xs text-muted-foreground">閲覧制限</span>;
  const row = query.data?.items?.find(
    (r) => r.requirement_id === requirementId,
  );
  if (!row)
    return <span className="text-xs text-muted-foreground">未集計</span>;
  const state =
    row.state === "passed" &&
    row.comparison?.current_requirement_version !== version
      ? "not_evaluated"
      : row.state;
  const hasFiles = Number(row.comparison?.file_count) > 0;
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusIndicator
        tone={
          state === "failed"
            ? "danger"
            : state === "requires_reassessment"
              ? "warning"
              : state === "passed"
                ? "success"
                : state === "requested"
                  ? "info"
                  : "neutral"
        }
      >
        {state === "passed" && hasFiles
          ? "合格記録・添付未再照合"
          : (verdictLabels[state] ?? state)}
      </StatusIndicator>
      {showLinks && row.plan_version ? (
        <span className="text-xs text-muted-foreground">
          確認表 {row.plan_version}版
        </span>
      ) : null}
      {showLinks && row.request_id ? (
        <Link
          className="text-xs underline"
          href={verdictHref(projectId, row.request_id, returnTo)}
        >
          根拠と判断
        </Link>
      ) : null}
    </div>
  );
}
