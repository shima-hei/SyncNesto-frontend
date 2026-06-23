"use client";

import { useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementApprovalRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { getRequirementApprovalStatusLabel } from "../../constants/requirement-options";
import { useDecideRequirementApproval } from "../../hooks/use-decide-requirement-approval";
import { useRequestRequirementApproval } from "../../hooks/use-request-requirement-approval";
import { useRequirementApprovals } from "../../hooks/use-requirement-approvals";
import { RequirementApprovalRequestForm } from "../forms/requirement-approval-request-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementApprovalsSectionProps = {
  projectId: number;
  targetType: string;
  targetId: number;
  title?: string;
  canReview: boolean;
};

export function RequirementApprovalsSection({
  projectId,
  targetType,
  targetId,
  title = "承認",
  canReview,
}: RequirementApprovalsSectionProps) {
  const [decisionTarget, setDecisionTarget] =
    useState<ApprovalDecisionTarget | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const { approvals, isLoading } = useRequirementApprovals(
    projectId,
    targetType,
    targetId
  );
  const {
    requestRequirementApproval,
    isPending: isRequestPending,
    error: requestError,
  } = useRequestRequirementApproval(projectId, targetType, targetId);
  const {
    approveRequirementApproval,
    rejectRequirementApproval,
    isPending: isDecisionPending,
  } = useDecideRequirementApproval(projectId);

  const openDecisionDialog = (
    approval: RequirementApprovalRead,
    action: ApprovalDecisionAction
  ) => {
    setDecisionTarget({ approval, action });
    setDecisionComment("");
    setDecisionError(null);
  };

  const closeDecisionDialog = () => {
    if (isDecisionPending) {
      return;
    }

    setDecisionTarget(null);
    setDecisionComment("");
    setDecisionError(null);
  };

  const handleDecisionSubmit = async () => {
    if (!decisionTarget) {
      return;
    }

    if (
      decisionTarget.action === "reject" &&
      !decisionComment.trim()
    ) {
      setDecisionError("差し戻し理由を入力してください。");
      return;
    }

    setDecisionError(null);

    if (decisionTarget.action === "approve") {
      await approveRequirementApproval(
        decisionTarget.approval.id,
        decisionComment.trim()
      );
    } else {
      await rejectRequirementApproval(
        decisionTarget.approval.id,
        decisionComment.trim()
      );
    }

    setDecisionTarget(null);
    setDecisionComment("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canReview ? (
          <RequirementApprovalRequestForm
            projectId={projectId}
            isPending={isRequestPending}
            error={requestError}
            onSubmit={requestRequirementApproval}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : approvals.length ? (
          <div className="flex flex-col gap-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {getRequirementApprovalStatusLabel(approval.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        承認者ID: {approval.approver_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        申請者ID: {approval.requested_by}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {approval.comment || "コメントはありません。"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      申請日時: {formatDateTime(approval.requested_at)} / 承認日時:{" "}
                      {formatDateTime(approval.approved_at)} / 差し戻し日時:{" "}
                      {formatDateTime(approval.rejected_at)}
                    </span>
                  </div>
                  {canReview && approval.status === "requested" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDecisionPending}
                        onClick={() => openDecisionDialog(approval, "approve")}
                      >
                        <CheckIcon data-icon="inline-start" />
                        承認
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDecisionPending}
                        onClick={() => openDecisionDialog(approval, "reject")}
                      >
                        <XIcon data-icon="inline-start" />
                        差し戻し
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            承認申請はありません。
          </p>
        )}
      </CardContent>
      <Dialog
        open={Boolean(decisionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            closeDecisionDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionTarget?.action === "reject"
                ? "承認申請を差し戻す"
                : "承認申請を承認する"}
            </DialogTitle>
            <DialogDescription>
              判断内容は承認履歴と変更履歴に残ります。
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>
              {decisionTarget?.action === "reject"
                ? "差し戻し理由"
                : "コメント"}
            </FieldLabel>
            <Textarea
              value={decisionComment}
              placeholder={
                decisionTarget?.action === "reject"
                  ? "差し戻し理由を入力"
                  : "任意でコメントを入力"
              }
              onChange={(event) => {
                setDecisionComment(event.target.value);
                setDecisionError(null);
              }}
            />
            {decisionError ? <FieldError>{decisionError}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDecisionPending}
              onClick={closeDecisionDialog}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant={
                decisionTarget?.action === "reject" ? "destructive" : "default"
              }
              disabled={isDecisionPending}
              onClick={handleDecisionSubmit}
            >
              {decisionTarget?.action === "reject" ? "差し戻し" : "承認"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type ApprovalDecisionAction = "approve" | "reject";

type ApprovalDecisionTarget = {
  approval: RequirementApprovalRead;
  action: ApprovalDecisionAction;
};
