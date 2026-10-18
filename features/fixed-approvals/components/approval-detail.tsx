"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SnapshotContent } from "@/features/artifact-releases/components/snapshot-content";
import { downloadFile } from "@/features/artifact-releases/lib/api";
import { formatDateTime } from "@/lib/format/date";
import type { ApprovalDecisionPreview } from "@/lib/api/generated/model";
import {
  allBasis,
  readApproval,
  previewDecision,
  decideApproval,
  cancelApproval,
} from "../lib/api";
import {
  approvalPath,
  basisLabels,
  numberValue,
  recordValue,
  statusLabels,
  textValue,
} from "../lib/display";
import { ChoiceField } from "./choice-field";
import { LegacyOriginCard } from "./legacy-origin-card";
import { useApprovalDraftGuard } from "../hooks/use-approval-draft-guard";

function ConfirmationField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <FieldLabel htmlFor={id}>{children}</FieldLabel>
    </Field>
  );
}

export function ApprovalDetail({
  projectId,
  approvalId,
}: {
  projectId: number;
  approvalId: string;
}) {
  const cache = useQueryClient();
  const [showContent, setShowContent] = useState(false);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<ApprovalDecisionPreview | null>(null);
  const [decision, setDecision] = useState("approve");
  const [comment, setComment] = useState("");
  const [fixed, setFixed] = useState(false);
  const [changed, setChanged] = useState(false);
  const [exceptions, setExceptions] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [cancelOperationId, setCancelOperationId] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const guard = useApprovalDraftGuard(!!comment || !!cancelReason);
  const query = useQuery({
    queryKey: ["approval", projectId, approvalId],
    queryFn: () => readApproval(projectId, approvalId),
    retry: false,
  });
  const basis = useQuery({
    queryKey: ["approval-fixed-basis", projectId, approvalId],
    queryFn: () => allBasis(projectId, { approval_id: approvalId }),
    enabled: query.data?.target_kind === "requirement_document",
    retry: false,
  });
  const begin = useMutation({
    mutationFn: () => previewDecision(projectId, approvalId),
    onSuccess: (value) => {
      setReview(value);
      setFixed(false);
      setChanged(false);
      setExceptions(false);
      setOperationId(crypto.randomUUID());
    },
  });
  const complete = async () => {
    guard.markSaved();
    setComment("");
    setCancelReason("");
    setReview(null);
    setCancelOpen(false);
    await Promise.all([
      cache.invalidateQueries({
        queryKey: ["approval", projectId, approvalId],
      }),
      cache.invalidateQueries({ queryKey: ["approval-history", projectId] }),
    ]);
  };
  const submit = useMutation({
    mutationFn: () => {
      if (!review) throw new Error("対象を確認してください");
      return decideApproval(projectId, approvalId, {
        version: review.version,
        operation_id: operationId,
        expected_review_digest: review.review_digest,
        decision: decision === "reject" ? "reject" : "approve",
        comment: comment.trim() || null,
        confirm_fixed_scope: fixed,
        confirm_changed_or_unknown: changed,
        confirm_exceptions: exceptions,
      });
    },
    onSuccess: complete,
  });
  const cancel = useMutation({
    mutationFn: () => {
      if (!query.data) throw new Error("依頼を読み込んでください");
      return cancelApproval(projectId, approvalId, {
        version: query.data.version,
        operation_id: cancelOperationId,
        reason: cancelReason.trim(),
      });
    },
    onSuccess: complete,
  });
  if (query.error)
    return (
      <DataLoadError
        resourceName="固定内容への依頼"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return <p>判断対象を読み込んでいます…</p>;
  const row = query.data;
  const title = textValue(row.scope_manifest.title, "固定した判断対象");
  const files = Array.isArray(row.scope_manifest.files)
    ? row.scope_manifest.files.map(recordValue)
    : [];
  const exceptionCount = numberValue(row.scope_manifest.exception_count);
  const changedBody = review?.observation.body_comparison !== "equal";
  const ready =
    !!review &&
    fixed &&
    (!changedBody || changed) &&
    (!review.exception_count || exceptions) &&
    (decision !== "reject" || !!comment.trim());
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={title}
        description={
          row.target_kind === "requirement"
            ? "個別要件の固定内容への合意"
            : "要件定義書の固定内容への正式承認"
        }
        actions={
          <Button asChild variant="outline">
            <Link href={approvalPath(projectId)}>依頼一覧へ</Link>
          </Button>
        }
      />
      <Alert>
        <AlertTitle>
          <Badge variant="outline">
            {statusLabels[row.status] ?? row.status}
          </Badge>{" "}
          保存時の版 {numberValue(row.scope_manifest.source_version)}
        </AlertTitle>
        <AlertDescription>
          <p>
            申請者：{row.requester_name ?? `ID ${row.requester_id}`} ／
            指定本人：{row.approver_name ?? `ID ${row.approver_id}`}
          </p>
          <p>
            申請日時 {formatDateTime(row.created_at)}
            。現在の要件・設計・添付へ判断が自動的に引き継がれることはありません。
          </p>
          {row.request_note ? (
            <p className="whitespace-pre-wrap">{row.request_note}</p>
          ) : null}
        </AlertDescription>
      </Alert>
      {row.legacy_import_id ? (
        <LegacyOriginCard
          projectId={projectId}
          importId={row.legacy_import_id}
        />
      ) : null}
      {row.legacy_import_id ? (
        <p className="text-sm text-muted-foreground">
          従来申請から切り替えた依頼です。過去の判断日時と今回の判断日時は別に保持します。
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>判断対象の本文・設計・添付</CardTitle>
          <CardDescription>
            {row.target_kind === "requirement"
              ? "対象はこの個別要件と同梱した設計・添付です。文書内の他の要件は参考表示です。"
              : "保存した文書・章・要件と、明示して同梱した設計・テスト設計・添付を確認します。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowContent(!showContent)}
          >
            {showContent
              ? "固定本文を閉じる"
              : "固定本文・設計・マトリクスを表示"}
          </Button>
          {showContent ? (
            <SnapshotContent projectId={projectId} releaseId={row.release_id} />
          ) : null}
          <p className="text-sm">
            判断に含む添付：
            {files.length ? `${files.length}件（保全済み）` : "添付なし"}
          </p>
          {files.map((file) => (
            <div
              key={textValue(file.file_id)}
              className="flex min-w-0 flex-wrap items-center gap-2"
            >
              <span className="min-w-0 truncate text-sm">
                {textValue(file.filename)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDownloadError("");
                  if (!row.preservation_id) return;
                  void downloadFile(
                    projectId,
                    row.release_id,
                    row.preservation_id,
                    textValue(file.file_id),
                  )
                    .then((result) => window.location.assign(result.url))
                    .catch((error) =>
                      setDownloadError(
                        error instanceof Error
                          ? error.message
                          : "取得できませんでした",
                      ),
                    );
                }}
              >
                保全したファイルを取得
              </Button>
              <span className="break-all text-xs text-muted-foreground">
                SHA-256 {textValue(file.content_digest)}
              </span>
            </div>
          ))}
          {downloadError ? (
            <p role="alert" className="text-sm">
              {downloadError}
            </p>
          ) : null}
        </CardContent>
      </Card>
      {row.target_kind === "requirement_document" ? (
        <Card>
          <CardHeader>
            <CardTitle>個別要件の合意根拠と例外</CardTitle>
            <CardDescription>
              {exceptionCount
                ? `${exceptionCount}件を例外として含む申請です。文書を承認しても、個別要件は未合意のまま残ります。`
                : "全件の合意だけでは文書を自動承認しません。対象要件0件は合意率100%とは扱いません。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {basis.error ? (
              <DataLoadError
                resourceName="合意根拠と例外"
                onRetry={() => void basis.refetch()}
              />
            ) : basis.isPending ? (
              <p>要件ごとの根拠を読み込んでいます…</p>
            ) : basis.data?.length ? (
              <>
                {basis.data.slice((page - 1) * 20, page * 20).map((item) => (
                  <div
                    key={item.node_id}
                    className="flex flex-col gap-1 border-b pb-3"
                  >
                    <p className="text-sm font-medium">
                      {item.title}{" "}
                      <Badge variant="outline">
                        {basisLabels[item.state] ?? item.state}
                      </Badge>
                    </p>
                    {item.reason ? (
                      <p className="whitespace-pre-wrap text-sm">
                        例外理由：{item.reason}
                      </p>
                    ) : null}
                    {item.agreed_approval_id ? (
                      <Link
                        className="text-sm underline"
                        href={approvalPath(projectId, item.agreed_approval_id)}
                      >
                        この本文に合意した記録を確認
                      </Link>
                    ) : null}
                  </div>
                ))}
                {basis.data.length > 20 ? (
                  <DataPagination
                    page={page}
                    pageSize={20}
                    total={basis.data.length}
                    currentCount={
                      basis.data.slice((page - 1) * 20, page * 20).length
                    }
                    onPageChange={setPage}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm">
                対象要件なし。文書本文への明示的な判断です。
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
      <FormApiError error={begin.error} />
      <div className="flex flex-wrap gap-2">
        {row.can_decide ? (
          <Button
            type="button"
            disabled={begin.isPending}
            onClick={() => begin.mutate()}
          >
            対象を確認して判断する
          </Button>
        ) : row.status === "requested" ? (
          <p className="text-sm text-muted-foreground">
            指定された本人が、必要な権限を持つ状態で判断します。
          </p>
        ) : null}
        {row.can_cancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCancelOperationId(crypto.randomUUID());
              setCancelOpen(true);
            }}
          >
            申請を取り消す
          </Button>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>申請・判断の履歴</CardTitle>
          <CardDescription>
            誰が、いつ、どの内容について判断したかを残します。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {row.events?.map((event) => (
            <div key={event.id} className="flex flex-col gap-1 border-b pb-3">
              <p className="text-sm font-medium">
                {statusLabels[event.action] ?? event.action}・
                {event.actor_name ?? `ID ${event.actor_id}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.occurred_at)}
              </p>
              {event.reason ? (
                <p className="whitespace-pre-wrap text-sm">{event.reason}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open && !submit.isPending) setReview(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>固定した内容への判断</DialogTitle>
            <DialogDescription>
              この判断は保存した対象にだけ残ります。最新版、タスク、テストの状態は変更されません。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Alert>
              <AlertTitle>
                {review?.observation.body_comparison === "equal"
                  ? "確認時点の本文は固定時点と一致しています"
                  : review?.observation.body_comparison === "changed"
                    ? "申請後に元の本文が変わっています"
                    : "現在の本文との一致を確認できません"}
              </AlertTitle>
              <AlertDescription>
                対象：保存時の版{" "}
                {numberValue(review?.observation.fixed_source_version)} ／
                現在：
                {numberValue(review?.observation.current_source_version) ||
                  "確認できません"}
                。添付は保全したファイルを判断し、現在の添付ファイルと内容が同じかは確認していません。
              </AlertDescription>
            </Alert>
            <ChoiceField
              label="判断"
              compact
              value={decision}
              onChange={setDecision}
              choices={[
                {
                  value: "approve",
                  label: exceptionCount ? "例外あり正式承認" : "合意・承認する",
                },
                { value: "reject", label: "差し戻す" },
              ]}
              disabled={submit.isPending}
            />
            <Field>
              <FieldLabel htmlFor="decision-comment">
                {decision === "reject"
                  ? "差し戻し理由（必須）"
                  : "判断メモ（任意）"}
              </FieldLabel>
              <Textarea
                id="decision-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                disabled={submit.isPending}
              />
            </Field>
            <FieldSet>
              <FieldLegend>判断前の確認</FieldLegend>
              <FieldGroup>
                <ConfirmationField checked={fixed} onChange={setFixed}>
                  固定した本文・設計・保全添付を判断対象として確認しました
                </ConfirmationField>
                {changedBody ? (
                  <ConfirmationField checked={changed} onChange={setChanged}>
                    変更・一致未確認を理解し、最新版へ引き継がない判断として確認しました
                  </ConfirmationField>
                ) : null}
                {review?.exception_count ? (
                  <ConfirmationField
                    checked={exceptions}
                    onChange={setExceptions}
                  >
                    例外となる全要件と理由を確認し、個別要件が未合意のまま残ることを確認しました
                  </ConfirmationField>
                ) : null}
              </FieldGroup>
            </FieldSet>
            <FormApiError error={submit.error} />
            {submit.error ? (
              <Button
                type="button"
                variant="outline"
                disabled={begin.isPending}
                onClick={() => begin.mutate()}
              >
                対象と現在の状態を再確認
              </Button>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submit.isPending}
              onClick={() => setReview(null)}
            >
              判断をやめる
            </Button>
            <Button
              disabled={!ready || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "保存しています…" : "この判断を記録する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!cancel.isPending) setCancelOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>未判断の依頼を取り消す</DialogTitle>
            <DialogDescription>
              依頼と対象内容は履歴として保持します。
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="cancel-reason">取消理由</FieldLabel>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              maxLength={2000}
            />
          </Field>
          <FormApiError error={cancel.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              戻る
            </Button>
            <Button
              disabled={!cancelReason.trim() || cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              理由を残して取り消す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...guard.dialogProps} />
    </div>
  );
}
