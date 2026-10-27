"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { formatDateTime } from "@/lib/format/date";
import type {
  VerdictDetail,
  VerdictDecisionResult,
} from "@/lib/api/generated/model";
import {
  advanceReview,
  beginReview,
  cancelRequest,
  decideRequest,
  getRequest,
  listEvents,
  withdrawRequest,
} from "../lib/verdict-api";
import { downloadEvidence, getEvidenceEntry } from "../lib/evidence-api";
import { evidenceRecord, evidenceResults } from "../lib/evidence";
import { safeVerificationOrigin, verificationHref } from "../lib/navigation";
import {
  label,
  records,
  strings,
  verdictHref,
  verdictLabels,
} from "../lib/verdict";
import { EvidenceRecord } from "./evidence-record";
import { VerdictReadiness } from "./verdict-readiness";

function FullEvidence({
  projectId,
  planId,
  entry,
  scope,
}: {
  projectId: number;
  planId: string;
  entry: Record<string, unknown>;
  scope: (string | number | undefined)[];
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: [...scope, "source-entry", entry.set_id, entry.id],
    queryFn: () =>
      getEvidenceEntry(projectId, planId, label(entry.set_id), label(entry.id)),
    enabled: open,
    retry: false,
  });
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        {open ? "元の記録を閉じる" : "実行内容・元の記録を確認"}
      </Button>
      {open ? (
        query.isError ? (
          <DataLoadError
            resourceName="元の保全記録"
            onRetry={() => void query.refetch()}
          />
        ) : query.data ? (
          <EvidenceRecord value={query.data} />
        ) : (
          <Skeleton className="h-20" aria-label="元の保全記録を読込中" />
        )
      ) : null}
    </>
  );
}

function VerdictHistory({
  projectId,
  requestId,
  scope,
}: {
  projectId: number;
  requestId: string;
  scope: (string | number | undefined)[];
}) {
  const query = useInfiniteQuery({
    queryKey: [...scope, "events"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listEvents(projectId, requestId, { cursor: pageParam }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
  if (query.isError)
    return (
      <DataLoadError
        resourceName="判断履歴"
        onRetry={() => void query.refetch()}
      />
    );
  if (query.isPending)
    return <Skeleton className="h-16" aria-label="判断履歴を読込中" />;
  return (
    <div className="flex flex-col gap-4">
      {query.data.pages
        .flatMap((p) => p.items)
        .map((e) => (
          <section key={e.id} className="flex flex-col gap-1">
            <p className="font-medium">
              {verdictLabels[e.event]} · {e.actor_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(e.created_at)}
            </p>
            <p className="whitespace-pre-wrap break-words">{e.reason}</p>
            {e.event === "decided" ? (
              <p className="text-sm">
                当時の判断：{verdictLabels[label(e.snapshot.result)]} ·
                根拠の確認日時は判断時点の記録です。
              </p>
            ) : null}
          </section>
        ))}
      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          過去の履歴をさらに表示
        </Button>
      ) : null}
    </div>
  );
}

function VerdictBody({
  projectId,
  row,
  scope,
  from,
  rowId,
  refresh,
}: {
  projectId: number;
  row: VerdictDetail;
  scope: (string | number | undefined)[];
  from: string;
  rowId: string | null;
  refresh: () => Promise<unknown>;
}) {
  const { user } = useAuth(),
    cache = useQueryClient();
  const [result, setResult] = useState<VerdictDecisionResult>("passed");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [na, setNa] = useState<string[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<
    "decide" | "cancel" | "withdraw" | null
  >(null);
  const [history, setHistory] = useState(false);
  const operation = useRef<{ input: string; id: string } | null>(null);
  const toChecklist = new URL(
    verificationHref(projectId, row.plan_id, from),
    "https://syncnesto.invalid",
  );
  if (rowId && /^[0-9a-f-]{36}$/i.test(rowId))
    toChecklist.searchParams.set("row", rowId);
  const input = () => {
    const data = {
        version: row.version,
        review_version: row.review_version,
        reason,
        result,
        acknowledge_requirement_difference: ack,
        confirmed_not_applicable_rows: na,
        unresolved_rows: unresolved,
      },
      serialized = JSON.stringify({ ...data, action: confirm });
    if (!operation.current || operation.current.input !== serialized)
      operation.current = { input: serialized, id: crypto.randomUUID() };
    return { ...data, operation_id: operation.current.id };
  };
  const action = useMutation({
    mutationFn: async (
      kind: "review" | "advance" | "decide" | "cancel" | "withdraw",
    ) => {
      if (kind === "review")
        return beginReview(projectId, row.id, {
          version: row.version,
          review_version: row.review_version,
        });
      if (kind === "advance")
        return advanceReview(projectId, row.id, {
          version: row.version,
          review_version: row.review_version,
        });
      const data = input();
      if (kind === "decide") return decideRequest(projectId, row.id, data);
      const simple = {
        version: data.version,
        operation_id: data.operation_id,
        reason: data.reason,
      };
      return kind === "cancel"
        ? cancelRequest(projectId, row.id, simple)
        : withdrawRequest(projectId, row.id, simple);
    },
    onSuccess: async (value) => {
      cache.setQueryData(scope, value);
      setConfirm(null);
      await cache.invalidateQueries({
        queryKey: ["requirement-verdict-summary"],
      });
      await cache.invalidateQueries({ queryKey: [...scope, "events"] });
    },
    onError: () => {
      void refresh();
    },
  });
  const download = useMutation({
    mutationFn: (file: Record<string, unknown>) =>
      downloadEvidence(
        projectId,
        row.plan_id,
        label(file.set_id),
        label(file.object_id),
      ),
    onSuccess: (value) => {
      const a = document.createElement("a");
      a.href = value.url;
      a.rel = "noreferrer";
      a.referrerPolicy = "no-referrer";
      a.download = "";
      a.click();
    },
  });
  const requiredNA = strings(row.readiness.not_applicable_rows),
    conditions = records(row.readiness.rows);
  const reviewed = Boolean(row.review_expires_at),
    filesLeft = row.files.length - row.verified_files;
  const positive =
    result === "passed"
      ? Boolean(row.readiness.passed_eligible)
      : Boolean(row.readiness.not_applicable_eligible);
  const sameSources =
    row.comparison.files_source === "same" &&
    row.comparison.checklist === "same" &&
    row.comparison.sources === "same" &&
    row.comparison.runs === "same" &&
    row.comparison.adverse === "none";
  const canDecide =
    reviewed &&
    reason.trim() &&
    (result === "failed"
      ? unresolved.length > 0
      : positive &&
        sameSources &&
        !filesLeft &&
        requiredNA.every((id) => na.includes(id)) &&
        (row.comparison.requirement === "same" ||
          (row.comparison.requirement === "changed" && ack)));
  const changed =
    row.comparison.files_source !== "same" ||
    ["requirement", "checklist", "sources"].some(
      (k) => row.comparison[k] !== "same",
    ) ||
    row.comparison.adverse === "found" ||
    row.comparison.judge_qualification === "changed" ||
    (row.status === "requested" && row.comparison.runs !== "same");
  const subject = evidenceRecord(row.fixed_subject.payload),
    busy = action.isPending;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`${toChecklist.pathname}${toChecklist.search}`}>
            確認表の行へ戻る
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={from}>元の要件一覧へ</Link>
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void refresh()}>
          更新
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                row.validity === "requires_reassessment" ||
                row.result === "failed"
                  ? "destructive"
                  : "outline"
              }
            >
              {row.validity === "passed" && row.files.length
                ? "合格記録・添付未再照合"
                : (verdictLabels[row.validity] ?? row.validity)}
            </Badge>
            {row.status !== "requested" && row.result ? (
              <span className="text-sm">
                保存した判断：{verdictLabels[row.result]}
              </span>
            ) : null}
          </div>
          <CardTitle>
            <h1 className="break-words">
              {label(subject.title) || "固定要件の最終判断"}
            </h1>
          </CardTitle>
          <CardDescription className="break-words">
            確認表 {row.plan_version}版 · 判定担当：{row.judge_name}
            {row.judge_id === user?.id ? "（あなた）" : ""}
          </CardDescription>
          {row.can_review ? (
            <Button asChild variant="outline" className="mt-2 self-start">
              <a href={reviewed ? "#verdict-decision" : "#verdict-review"}>
                {reviewed ? "判断入力へ" : "根拠の確認へ"}
              </a>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {changed ? (
            <Alert>
              <AlertTitle>
                現在の内容・資格との照合を確認してください
              </AlertTitle>
              <AlertDescription>
                {row.comparison.requirement !== "same" ? (
                  <p>
                    要件本文に違いがあるか、照合できません。この依頼の対象は固定内容のままです。
                  </p>
                ) : null}
                {!sameSources ? (
                  <p>
                    確認表・対象・実行が変わったか、NG・保留があります。合格へ自動復帰しません。
                  </p>
                ) : null}
                {row.comparison.judge_qualification === "changed" ? (
                  <p>
                    判定担当の資格が変わりました。未完依頼を取り消すか、再判定の依頼で担当を指定してください。
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {row.status === "requested" ? (
            <VerdictReadiness value={row.readiness} />
          ) : (
            <>
              <p>
                判断者：{row.judge_name} ·{" "}
                {row.decided_at ? formatDateTime(row.decided_at) : "未確定"}
              </p>
              <p
                className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words"
                role="region"
                aria-label="保存した判断理由"
                tabIndex={0}
              >
                {row.decision_reason}
              </p>
              {row.status === "cancelled" || row.status === "withdrawn" ? (
                <p className="text-sm text-muted-foreground">
                  この記録は現在の合格として利用しません。元の判断と履歴は残ります。
                </p>
              ) : null}
            </>
          )}
          {row.can_review ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                id="verdict-review"
                disabled={busy}
                onClick={() => action.mutate("review")}
              >
                {reviewed ? "確認作業を再取得" : "根拠の確認を始める"}
              </Button>
              {reviewed ? (
                <p className="text-sm text-muted-foreground">
                  確認期限：{formatDateTime(row.review_expires_at!)} · 添付{" "}
                  {row.verified_files}/{row.files.length}件
                </p>
              ) : null}
            </div>
          ) : null}
          {row.review_error ? (
            <Alert>
              <AlertDescription>
                保全ファイルを確認できませんでした。ファイルの確認を再実行するか、不足を残して不合格の判断を行えます。
              </AlertDescription>
            </Alert>
          ) : null}
          {reviewed && row.can_review && filesLeft > 0 ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => action.mutate("advance")}
            >
              保全添付を1件確認（残り{filesLeft}件）
            </Button>
          ) : null}
          <FormApiError error={action.error ?? download.error} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>判断の根拠</CardTitle>
          <CardDescription>
            選択した固定記録 {row.entries.length}件 · 保全添付{" "}
            {row.files.length}件
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <details>
            <summary className="cursor-pointer py-1">固定要件の本文</summary>
            <div className="flex flex-col gap-3 py-3">
              {["description", "acceptance_criteria"].map((key) =>
                label(subject[key]) ? (
                  <MarkdownPreview key={key} value={label(subject[key])} />
                ) : null,
              )}
            </div>
          </details>
          {row.entries.map((entry) => {
            const execution = evidenceRecord(entry.execution);
            return (
              <details key={`${label(entry.set_id)}:${label(entry.id)}`}>
                <summary className="cursor-pointer break-words py-1">
                  {label(entry.row_description)} ·{" "}
                  {evidenceResults[label(execution.status ?? entry.result)] ??
                    "対象外候補"}
                </summary>
                <div className="flex flex-col gap-3 py-3">
                  <p>
                    {label(entry.submitted_by)} ·{" "}
                    {formatDateTime(label(entry.submitted_at))}
                  </p>
                  {entry.use === "historical_record" ? (
                    <Alert>
                      <AlertDescription>
                        参考記録です。現在の合格根拠には自動採用しません。
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <MarkdownPreview value={label(entry.reason)} />
                  {label(entry.checked_content) ? (
                    <MarkdownPreview value={label(entry.checked_content)} />
                  ) : null}
                  {label(execution.actual_result ?? entry.actual_result) ? (
                    <MarkdownPreview
                      value={label(
                        execution.actual_result ?? entry.actual_result,
                      )}
                    />
                  ) : null}
                  <FullEvidence
                    projectId={projectId}
                    planId={row.plan_id}
                    entry={entry}
                    scope={scope}
                  />
                </div>
              </details>
            );
          })}
          {row.files.map((f) => (
            <div
              key={label(f.object_id)}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="min-w-0 break-all">{label(f.filename)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={download.isPending}
                onClick={() => download.mutate(f)}
              >
                保全ファイルを開く
              </Button>
            </div>
          ))}
          {row.files.length ? (
            <p className="text-xs text-muted-foreground">
              確認日時はその時点の同一性の記録です。この表示でファイルを再ダウンロードしてはいません。
            </p>
          ) : null}
        </CardContent>
      </Card>
      {row.can_review && reviewed ? (
        <Card id="verdict-decision" tabIndex={-1}>
          <CardHeader>
            <CardTitle>判断を残す</CardTitle>
            <CardDescription>
              合格・対象外は全条件と保全添付の確認が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>判定</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={result}
                  onValueChange={(v) => {
                    if (v) setResult(v as VerdictDecisionResult);
                  }}
                  disabled={busy}
                  className="flex flex-wrap justify-start"
                >
                  <ToggleGroupItem value="passed">合格</ToggleGroupItem>
                  <ToggleGroupItem value="failed">不合格</ToggleGroupItem>
                  <ToggleGroupItem value="not_applicable">
                    対象外
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              {result === "failed" ? (
                <FieldGroup>
                  {conditions.map((condition) => (
                    <Field
                      key={label(condition.row_id)}
                      orientation="horizontal"
                    >
                      <Checkbox
                        id={`unresolved-${label(condition.row_id)}`}
                        checked={unresolved.includes(label(condition.row_id))}
                        onCheckedChange={(v) =>
                          setUnresolved((items) =>
                            v === true
                              ? [...items, label(condition.row_id)]
                              : items.filter((id) => id !== condition.row_id),
                          )
                        }
                        disabled={busy}
                      />
                      <FieldLabel
                        htmlFor={`unresolved-${label(condition.row_id)}`}
                      >
                        未達・未解決：{label(condition.description)}
                      </FieldLabel>
                    </Field>
                  ))}
                </FieldGroup>
              ) : (
                <FieldGroup>
                  {requiredNA.map((id) => (
                    <Field key={id} orientation="horizontal">
                      <Checkbox
                        id={`na-${id}`}
                        checked={na.includes(id)}
                        onCheckedChange={(v) =>
                          setNa((items) =>
                            v === true
                              ? [...items, id]
                              : items.filter((x) => x !== id),
                          )
                        }
                        disabled={busy}
                      />
                      <FieldLabel htmlFor={`na-${id}`}>
                        対象外の理由を確認：
                        {label(
                          conditions.find((r) => r.row_id === id)?.description,
                        )}
                      </FieldLabel>
                    </Field>
                  ))}
                  {row.comparison.requirement === "changed" ? (
                    <Field orientation="horizontal">
                      <Checkbox
                        id="ack-requirement"
                        checked={ack}
                        onCheckedChange={(v) => setAck(v === true)}
                        disabled={busy}
                      />
                      <FieldLabel htmlFor="ack-requirement">
                        現在の要件とは異なる、この固定内容を判断します
                      </FieldLabel>
                    </Field>
                  ) : null}
                </FieldGroup>
              )}
              <Field>
                <FieldLabel htmlFor="verdict-reason">判断理由</FieldLabel>
                <Textarea
                  id="verdict-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={4000}
                  disabled={busy}
                />
              </Field>
              <Button
                disabled={busy || !canDecide}
                onClick={() => setConfirm("decide")}
              >
                判断内容を確認
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}
      {row.can_cancel || row.can_withdraw ? (
        <details>
          <summary className="cursor-pointer py-1">
            {row.can_cancel ? "依頼の取消" : "確定した判断の撤回"}
          </summary>
          <FieldGroup className="py-3">
            <Field>
              <FieldLabel htmlFor="verdict-transition-reason">
                理由（必須）
              </FieldLabel>
              <Textarea
                id="verdict-transition-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={4000}
                disabled={busy}
              />
            </Field>
            <Button
              variant="outline"
              disabled={busy || !reason.trim()}
              onClick={() => setConfirm(row.can_cancel ? "cancel" : "withdraw")}
            >
              {row.can_cancel ? "依頼を取り消す" : "判断を撤回する"}
            </Button>
          </FieldGroup>
        </details>
      ) : null}
      {row.previous_request_id ? (
        <p className="text-sm">
          見直し元：
          <Link
            className="underline"
            href={verdictHref(projectId, row.previous_request_id, from, rowId)}
          >
            直前の依頼
          </Link>
          {row.reviewed_decision_id &&
          row.reviewed_decision_id !== row.previous_request_id ? (
            <>
              {" "}
              ·{" "}
              <Link
                className="underline"
                href={verdictHref(
                  projectId,
                  row.reviewed_decision_id,
                  from,
                  rowId,
                )}
              >
                見直す確定判断
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <details onToggle={(e) => setHistory(e.currentTarget.open)}>
        <summary className="cursor-pointer py-1">依頼・判断の履歴</summary>
        {history ? (
          <div className="py-3">
            <VerdictHistory
              projectId={projectId}
              requestId={row.id}
              scope={scope}
            />
          </div>
        ) : null}
      </details>
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "decide"
                ? `${verdictLabels[result]}として確定`
                : confirm === "cancel"
                  ? "依頼を取り消す"
                  : "判断を撤回する"}
            </DialogTitle>
            <DialogDescription>
              確認表 {row.plan_version}版 · {row.judge_name}
              。この操作と理由を履歴へ残します。
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words">{reason}</p>
          <FormApiError error={action.error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              戻る
            </Button>
            <Button
              disabled={busy || !confirm}
              onClick={() => {
                if (confirm) action.mutate(confirm);
              }}
            >
              確定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VerdictPage({
  projectId,
  requestId,
}: {
  projectId: number;
  requestId: string;
}) {
  const { user } = useAuth(),
    { tenant } = useTenant(),
    params = useSearchParams();
  const scope = [
    "verification-request",
    tenant?.id,
    user?.id,
    projectId,
    requestId,
  ];
  const query = useQuery({
    queryKey: scope,
    queryFn: ({ signal }) => getRequest(projectId, requestId, { signal }),
    enabled: Boolean(user && tenant),
    retry: false,
    refetchOnWindowFocus: true,
  });
  if (query.isPending)
    return <Skeleton className="h-64" aria-label="要件の判断依頼を読込中" />;
  if (query.isError || !query.data)
    return (
      <DataLoadError
        resourceName="判断依頼（権限・利用状態も確認してください）"
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <VerdictBody
      key={`${tenant?.id}:${user?.id}:${requestId}`}
      projectId={projectId}
      row={query.data}
      scope={scope}
      from={safeVerificationOrigin(params.get("from"), projectId)}
      rowId={params.get("row")}
      refresh={() => query.refetch()}
    />
  );
}
