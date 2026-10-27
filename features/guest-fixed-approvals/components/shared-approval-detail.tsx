"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  FieldDescription,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { PublicationBody } from "@/features/artifact-publications/components/publication-content";
import { SharedAttachments } from "@/features/artifact-publications/components/shared-attachments";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { loadSharedContent } from "@/features/artifact-publications/lib/load-shared-content";
import {
  statusLabels,
  basisLabels,
} from "@/features/fixed-approvals/lib/display";
import { ApiError } from "@/lib/api/error";
import type {
  GuestApprovalBasis,
  SharedApprovalDecisionPreview,
} from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import {
  readSharedApproval,
  readSharedBases,
  previewSharedDecision,
  decideSharedApproval,
} from "../lib/api";
import {
  approvalKindLabels,
  approvalActionLabels,
  sharedApprovalPath,
} from "../lib/display";
import { ApprovalMfa } from "./approval-mfa";

export function SharedApprovalDetail({
  publicationId,
  approvalId,
  downloadsEnabled,
}: {
  publicationId: string;
  approvalId: string;
  downloadsEnabled: boolean;
}) {
  const [comment, setComment] = useState("");
  const [review, setReview] = useState<SharedApprovalDecisionPreview | null>(
    null,
  );
  const [fixed, setFixed] = useState(false);
  const [changed, setChanged] = useState(false);
  const [exceptions, setExceptions] = useState(false);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const operation = useRef("");
  const locked = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
    if (hidden) {
      setComment("");
      setReview(null);
      setFixed(false);
      setChanged(false);
      setExceptions(false);
      setReady(false);
      setError(null);
      operation.current = "";
    }
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const request = await readSharedApproval(publicationId, approvalId, {
        signal,
      });
      const [content, bases] = await Promise.all([
        loadSharedContent(publicationId, signal),
        (async () => {
          const result: GuestApprovalBasis[] = [];
          let cursor: string | undefined;
          let scope: string | undefined;
          do {
            const page = await readSharedBases(
              publicationId,
              approvalId,
              { cursor, page_size: 100 },
              { signal },
            );
            if (scope && scope !== page.scope_digest)
              throw new Error("確認する構成が変わりました");
            scope = page.scope_digest;
            result.push(...page.items);
            cursor = page.next_cursor ?? undefined;
            if (!cursor && result.length !== page.total)
              throw new Error("合意根拠を全件取得できませんでした");
          } while (cursor);
          return result;
        })(),
      ]);
      const current = await readSharedApproval(publicationId, approvalId, {
        signal,
      });
      if (
        request.authorization_revision !==
          content.metadata.authorization_revision ||
        current.authorization_revision !== request.authorization_revision ||
        current.version !== request.version ||
        current.public_scope_digest !== request.public_scope_digest
      )
        throw new Error("公開許可または依頼の状態が変わりました");
      return { request, content, bases };
    },
    [publicationId, approvalId],
  );
  const data = useFreshShared(`${publicationId}:${approvalId}`, load, mask);
  const { value, refresh } = data;
  useEffect(() => {
    if (!value) return;
    const deadline = Math.min(
      Date.parse(value.request.expires_at),
      review ? Date.parse(review.expires_at) : Infinity,
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, review, refresh]);

  async function begin(choice: "approve" | "reject") {
    if (!value || !ready || locked.current || data.operationSignal?.aborted)
      return;
    locked.current = true;
    setBusy(true);
    setError(null);
    const signal = data.operationSignal;
    try {
      const result = await previewSharedDecision(publicationId, approvalId, {
        signal,
      });
      if (signal?.aborted) return;
      setDecision(choice);
      setReview(result);
      setFixed(false);
      setChanged(false);
      setExceptions(false);
      operation.current = crypto.randomUUID();
    } catch (failure) {
      if (!signal?.aborted) {
        await refresh();
        setError(failure as Error);
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function submit() {
    if (!review || !value || locked.current || data.operationSignal?.aborted)
      return;
    locked.current = true;
    setBusy(true);
    setError(null);
    const signal = data.operationSignal;
    try {
      await decideSharedApproval(
        publicationId,
        approvalId,
        {
          version: review.version,
          review_proof: review.review_proof,
          operation_id: operation.current,
          decision,
          comment: comment.trim() || null,
          confirm_fixed_scope: fixed,
          confirm_changed_or_unknown: changed,
          confirm_exceptions: exceptions,
        },
        { signal },
      );
      if (!signal?.aborted) await refresh();
    } catch (failure) {
      if (!signal?.aborted) {
        await refresh();
        setError(failure as Error);
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const row = value?.request;
  const canSubmit =
    !!review &&
    fixed &&
    (review.body_comparison === "equal" || changed) &&
    (!review.exception_count || exceptions) &&
    (decision !== "reject" || !!comment.trim());
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/shared/publications" prefetch={false}>
            共有一覧へ
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void refresh()}>
          閲覧許可と依頼を再確認
        </Button>
      </div>
      <div ref={root} className="flex min-w-0 flex-col gap-6 break-words">
        {data.error instanceof ApiError &&
        data.error.code === "MFA_REQUIRED" ? (
          <ApprovalMfa
            returnTo={sharedApprovalPath(publicationId, approvalId)}
          />
        ) : data.error ? (
          <Alert>
            <AlertTitle>現在この判断依頼を確認できません</AlertTitle>
            <AlertDescription>
              公開状態・期限・ログイン中の本人を依頼元へ確認してください。以前の本文や判断内容は表示しません。
            </AlertDescription>
          </Alert>
        ) : !value || !row ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                {approvalKindLabels[row.target_kind]}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    row.status === "rejected" || row.status === "cancelled"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {statusLabels[row.status]}
                </Badge>
                {row.exception_count ? (
                  <Badge variant="destructive">
                    例外 {row.exception_count}件
                  </Badge>
                ) : null}
                <span className="text-sm">承認者：あなた</span>
                {row.status === "requested" && row.can_decide ? (
                  <Button asChild size="sm">
                    <a href="#shared-approval-decision">判断入力へ</a>
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 break-words text-sm text-muted-foreground">
                依頼元：{row.requester_name} · 固定日時：
                {formatDateTime(row.captured_at)}
              </p>
              <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight">
                {row.title}
              </h1>
            </div>
            {row.status === "requested" && !row.can_decide ? (
              <Alert>
                <AlertTitle>判断操作は停止しています</AlertTitle>
                <AlertDescription>
                  現在、新しい判断は記録できません。依頼元へ確認してください。
                </AlertDescription>
              </Alert>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>今回、確認していただきたいこと</CardTitle>
                <CardDescription>
                  {formatDateTime(row.captured_at)}時点の固定内容への判断です。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p
                  className="max-h-40 overflow-y-auto break-words whitespace-pre-wrap text-sm"
                  role="region"
                  aria-label="依頼メモ"
                  tabIndex={0}
                >
                  {row.request_note ||
                    "この依頼の目的・確認観点が分からない場合は、依頼元へ確認してください。"}
                </p>
                <p className="text-sm">
                  対象：{approvalKindLabels[row.target_kind]}
                  。選択した固定添付も含みます。
                  {["specification", "test_design"].includes(row.target_kind)
                    ? "他の要件・設計は参考資料です。"
                    : "明示して同梱した設計・テスト設計も確認してください。"}
                </p>
                <p className="text-sm text-muted-foreground">
                  閲覧期限 {formatDateTime(row.expires_at)}
                </p>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer rounded-sm focus-visible:outline-2">
                    判断の対象・範囲について
                  </summary>
                  <p className="mt-2">
                    最新版や他の対象への承認には引き継がれません。テスト設計を承認しても、テスト実行・合格が確定するわけではありません。
                  </p>
                </details>
                <Button asChild variant="outline" size="sm">
                  <a href={`#public-node-${row.target_node_id}`}>
                    今回の対象へ移動
                  </a>
                </Button>
              </CardContent>
            </Card>
            <PublicationBody
              key={row.authorization_revision}
              nodes={value.content.nodes}
              publicationId={`${publicationId}:${row.authorization_revision}`}
              onReady={setReady}
            />
            <SharedAttachments
              key={`${row.authorization_revision}:files`}
              publicationId={publicationId}
              files={value.content.metadata.content.files}
              revision={row.authorization_revision}
              signal={data.operationSignal}
              enabled={downloadsEnabled}
            />
            {row.target_kind === "requirement_document" ? (
              <Card>
                <CardHeader>
                  <CardTitle>要件ごとの外部合意と例外</CardTitle>
                  <CardDescription>
                    申請時の根拠です。文書の承認で未合意の要件を合意済みに変更しません。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {!value.bases.length ? (
                    <p className="text-sm">
                      対象要件なし。合意率100%という意味ではありません。
                    </p>
                  ) : (
                    value.bases.map((basis) => (
                      <div key={basis.node_id} className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{basis.title}</p>
                        <p className="text-sm">
                          {basis.state === "agreed"
                            ? "同じ要件内容への外部参加者の合意あり"
                            : (basisLabels[basis.state] ?? "外部合意不足")}
                        </p>
                        {basis.reason ? (
                          <p className="whitespace-pre-wrap text-sm">
                            例外理由：{basis.reason}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}
            <FormApiError error={error} />
            {row.status === "requested" ? (
              <Card id="shared-approval-decision" tabIndex={-1}>
                <CardHeader>
                  <CardTitle>内容を確認して判断する</CardTitle>
                  <CardDescription>
                    差し戻す場合は理由が必要です。依頼元とあなたが参照できます。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="guest-decision-reason">
                        判断理由・確認してほしい点
                      </FieldLabel>
                      <Textarea
                        id="guest-decision-reason"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        maxLength={2000}
                        disabled={busy}
                      />
                      <FieldDescription>
                        本文・設計・添付を確認してから、次の確認画面へ進みます。
                      </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!ready || !row.can_decide || busy}
                        onClick={() => void begin("approve")}
                      >
                        {row.exception_count
                          ? "例外あり正式承認の確認へ"
                          : `${approvalActionLabels[row.target_kind]}：確認へ`}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={
                          !ready || !row.can_decide || busy || !comment.trim()
                        }
                        onClick={() => void begin("reject")}
                      >
                        差し戻しの確認へ
                      </Button>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertTitle>{statusLabels[row.status]}</AlertTitle>
                <AlertDescription>
                  <p>
                    {row.finalized_at ? formatDateTime(row.finalized_at) : ""}
                    の記録です。
                    {row.status === "cancelled"
                      ? "依頼元が取り消しました。新しい依頼がある場合はそちらを確認してください。"
                      : "次は依頼元が結果を確認して対応します。この固定内容への判断は保存されました。"}
                  </p>
                  {row.decision_reason ? (
                    <p
                      className="max-h-40 overflow-y-auto break-words whitespace-pre-wrap"
                      role="region"
                      aria-label="あなたの判断理由"
                      tabIndex={0}
                    >
                      あなたの判断理由：{row.decision_reason}
                    </p>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
      <Dialog
        open={!!review && !!row}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "reject"
                ? "この固定内容を差し戻しますか"
                : row?.exception_count
                  ? "例外を明示した正式承認"
                  : "この固定内容への判断を確定"}
            </DialogTitle>
            <DialogDescription>
              対象：{row?.title}。確定後にこの判断を上書きすることはできません。
            </DialogDescription>
          </DialogHeader>
          <FieldSet>
            <FieldLegend>確認事項</FieldLegend>
            <Field orientation="horizontal">
              <Checkbox
                id="guest-confirm-fixed"
                checked={fixed}
                onCheckedChange={(v) => setFixed(v === true)}
                disabled={busy}
              />
              <FieldLabel htmlFor="guest-confirm-fixed">
                今回の対象と固定した本文・設計・添付を確認しました
              </FieldLabel>
            </Field>
            {review?.body_comparison !== "equal" ? (
              <Field orientation="horizontal">
                <Checkbox
                  id="guest-confirm-changed"
                  checked={changed}
                  onCheckedChange={(v) => setChanged(v === true)}
                  disabled={busy}
                />
                <FieldLabel htmlFor="guest-confirm-changed">
                  社内の現在内容と相違がある、または一致未確認であることを確認しました
                </FieldLabel>
              </Field>
            ) : null}
            {review?.exception_count ? (
              <Field orientation="horizontal">
                <Checkbox
                  id="guest-confirm-exceptions"
                  checked={exceptions}
                  onCheckedChange={(v) => setExceptions(v === true)}
                  disabled={busy}
                />
                <FieldLabel htmlFor="guest-confirm-exceptions">
                  例外の全要件・理由と、未合意が残ることを確認しました
                </FieldLabel>
              </Field>
            ) : null}
          </FieldSet>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              確認に戻る
            </Button>
            <Button disabled={!canSubmit || busy} onClick={() => void submit()}>
              {busy
                ? "保存しています…"
                : decision === "reject"
                  ? "差し戻しを確定する"
                  : row?.exception_count
                    ? "例外あり正式承認を確定する"
                    : "合意・承認を確定する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
