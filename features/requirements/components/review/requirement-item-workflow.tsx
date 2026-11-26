"use client";

import Link from "next/link";
import {
  StatusIndicator,
  type IndicatorTone,
} from "@/components/shared/display/status-badge";
import { Button } from "@/components/ui/button";
import { RequirementVerdict } from "@/features/projects/components/joined/requirement-verdict";
import type { useRequirementVerdicts } from "@/features/projects/hooks/use-requirement-verdicts";
import type {
  RequirementItemWorkflowState,
  RequirementRead,
  RequirementWorkflowRead,
} from "@/lib/api/generated/model";
import type { useRequirementItemWorkflow } from "../../hooks/use-requirement-item-workflow";
import { requirementWorkflowHref } from "../../lib/requirement-workflow-review";

const authoringLabels = {
  draft: "下書き",
  defined: "作成済み",
  excluded: "対象外",
};

const reviewLabels = {
  not_reviewed: "未確認",
  changes_requested: "要修正",
  confirmed: "確認済み",
  changed: "変更あり",
  restricted: "閲覧制限",
};

const approvalLabels = {
  not_approved: "未承認",
  approved: "承認済み版に含まれる",
  changed: "承認後変更あり",
  restricted: "閲覧制限",
};

const reviewTones: Record<
  RequirementItemWorkflowState["review"],
  IndicatorTone
> = {
  not_reviewed: "neutral",
  changes_requested: "warning",
  confirmed: "success",
  changed: "changed",
  restricted: "neutral",
};

export function RequirementItemReviewBadge({
  review,
  pending = false,
}: {
  review: RequirementItemWorkflowState["review"];
  pending?: boolean;
}) {
  const waiting = review === "not_reviewed" && pending;
  return (
    <StatusIndicator tone={waiting ? "info" : reviewTones[review]}>
      {waiting ? "確認待ち" : reviewLabels[review]}
    </StatusIndicator>
  );
}

export function RequirementItemWorkflow({
  projectId,
  requirement,
  returnTo,
  query,
  verdicts,
  approvalStatus,
}: {
  projectId: number;
  requirement: RequirementRead;
  returnTo: string;
  query: ReturnType<typeof useRequirementItemWorkflow>;
  verdicts: ReturnType<typeof useRequirementVerdicts>;
  approvalStatus?: RequirementWorkflowRead["status"];
}) {
  const state = query.data?.[0];
  const pendingApproval =
    state?.approval === "not_approved" && approvalStatus === "requested";
  const returnedApproval =
    state?.approval === "not_approved" && approvalStatus === "returned";
  return (
    <dl className="grid gap-2 border-t pt-3 text-sm [&>div]:grid [&>div]:grid-cols-[6.5rem_minmax(0,1fr)] [&>div]:items-baseline [&>div]:gap-2">
      {state ? (
        <>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">作成状態</dt>
            <dd>
              <StatusIndicator
                tone={state.authoring === "defined" ? "info" : "neutral"}
              >
                {authoringLabels[state.authoring]}
              </StatusIndicator>
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">レビュー状況</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <RequirementItemReviewBadge
                review={state.review}
                pending={Boolean(state.review_request_id)}
              />
              {state.review_request_id ? (
                <Link
                  className="text-xs underline"
                  href={requirementWorkflowHref(
                    projectId,
                    state.review_request_id,
                  )}
                >
                  レビュー依頼を確認
                </Link>
              ) : null}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">正式承認状況</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <StatusIndicator
                tone={
                  pendingApproval
                    ? "info"
                    : returnedApproval
                      ? "danger"
                      : state.approval === "changed"
                        ? "changed"
                        : state.approval === "approved"
                          ? "success"
                          : "neutral"
                }
              >
                {pendingApproval
                  ? "承認待ち"
                  : returnedApproval
                    ? "差し戻し"
                    : approvalLabels[state.approval]}
              </StatusIndicator>
              {state.approved_request_id ? (
                <Link
                  className="text-xs underline"
                  href={requirementWorkflowHref(
                    projectId,
                    state.approved_request_id,
                  )}
                >
                  {state.approved_version_label}
                </Link>
              ) : null}
            </dd>
          </div>
        </>
      ) : (
        <div>
          <dt className="text-muted-foreground">要件の状態</dt>
          <dd>
            {query.isError ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void query.refetch()}
              >
                状態の取得を再試行
              </Button>
            ) : query.isFetching ? (
              "確認中…"
            ) : (
              "―"
            )}
          </dd>
        </div>
      )}
      <div className="grid gap-1">
        <dt className="text-muted-foreground">実装・検証状況</dt>
        <dd>
          {verdicts.data?.state === "disabled" ? (
            "検証を利用できません"
          ) : (
            <RequirementVerdict
              query={verdicts}
              requirementId={requirement.id}
              version={requirement.version}
              projectId={projectId}
              returnTo={returnTo}
              showLinks={false}
            />
          )}
        </dd>
      </div>
    </dl>
  );
}
