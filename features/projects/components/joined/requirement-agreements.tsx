"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RequirementAgreementResult } from "@/lib/api/generated/model";
import type { useRequirementAgreements } from "@/features/projects/hooks/use-requirement-agreements";
import { withOverviewOrigin } from "@/lib/navigation/overview-origin";
import { agreementDisplay } from "@/features/projects/lib/requirement-agreement-display";

const LABELS: Record<RequirementAgreementResult["state"], string> = {
  agreed: "合意あり",
  conflicting: "判断が分かれています",
  rejected: "差し戻しあり",
  pending: "確認待ち",
  cancelled: "取消済み・合意なし",
  changed: "更新後の確認が必要",
  legacy_unverified: "従来記録・対象未確認",
  unagreed: "合意記録なし",
  not_evaluated: "未集計",
};

export function RequirementAgreements({
  query,
  requirementId,
  version,
  projectId,
  returnTo,
}: {
  query: ReturnType<typeof useRequirementAgreements>;
  requirementId: number;
  version: number;
  projectId: number;
  returnTo?: string;
}) {
  const display = agreementDisplay(query, requirementId, version);
  if (display.kind === "loading")
    return (
      <Skeleton className="h-12 w-48" aria-label="現在内容への合意を確認中" />
    );
  if (display.kind !== "ready")
    return <p className="text-xs text-muted-foreground">{display.message}</p>;
  const { row } = display;
  return (
    <div className="flex flex-col items-start gap-2">
      {(
        [
          ["internal", "社内"],
          ["external", "外部"],
        ] as const
      ).map(([side, label]) => {
        const result = row[side];
        const path = result.approval_id
          ? `/projects/joined/${projectId}/fixed-approvals/${result.approval_id}`
          : `/projects/joined/${projectId}/fixed-approvals?targetKind=requirement&sourceId=${requirementId}`;
        const href = returnTo
          ? withOverviewOrigin(path, projectId, returnTo)
          : path;
        return (
          <div key={side} className="flex flex-wrap items-center gap-1">
            <Badge
              variant={
                result.state === "agreed"
                  ? "default"
                  : result.state === "conflicting" ||
                      result.state === "rejected"
                    ? "destructive"
                    : "outline"
              }
            >
              {label}：{LABELS[result.state]}
            </Badge>
            {returnTo &&
            result.state !== "unagreed" &&
            result.state !== "not_evaluated" ? (
              <Button variant="link" size="sm" asChild>
                <Link href={href}>{label}判断の根拠</Link>
              </Button>
            ) : null}
          </div>
        );
      })}
      {returnTo &&
      (row.internal.state === "not_evaluated" ||
        row.external.state === "not_evaluated") ? (
        <p className="text-xs text-muted-foreground">
          対象の大きさ・読取中の変更・判断記録の整合性により、合意を確定表示できません。
        </p>
      ) : null}
    </div>
  );
}

export function AgreementRefresh({
  query,
  onRefresh,
}: {
  query: ReturnType<typeof useRequirementAgreements>;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={query.isFetching}
        onClick={() => {
          void query.refetch();
          onRefresh?.();
        }}
      >
        合意状況を更新
      </Button>
      {query.data && !query.isError ? (
        <span className="text-xs text-muted-foreground">
          {new Date(query.data.evaluated_at).toLocaleString("ja-JP")} 時点の確認
        </span>
      ) : null}
    </div>
  );
}
