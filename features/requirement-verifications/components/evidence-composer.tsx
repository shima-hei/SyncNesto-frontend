"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { useConfirmAction } from "@/features/test-designs/hooks/use-confirm-action";
import {
  listDocumentsProjectsProjectIdDocumentsGet as listDocuments,
  listDocumentAttachmentsProjectsProjectIdDocumentsDocumentIdAttachmentsGet as listAttachments,
} from "@/lib/api/generated/documents/documents";
import { listTestEvidenceProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsExecutionIdEvidenceGet as listTestFiles } from "@/lib/api/generated/test-collaboration/test-collaboration";
import type {
  EvidenceEntry,
  EvidenceFile,
  EvidencePreview,
  EvidenceSelection,
  VerificationRow,
} from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { listCandidates } from "../lib/api";
import { createEvidence, previewEvidence } from "../lib/evidence-api";
import { evidenceKinds, evidenceResults, evidenceText } from "../lib/evidence";

type Context = {
  projectId: number;
  planId: string;
  version: number;
  rows: VerificationRow[];
  selected: string | null;
  returnTo: string;
  queryScope: (string | number | undefined)[];
  documentAllowed: boolean;
};

export function EvidenceComposer({
  context: c,
  onClose,
  onCreated,
}: {
  context: Context;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [rowId, setRowId] = useState(c.selected ?? c.rows[0]?.id ?? "");
  const row = c.rows.find((r) => r.id === rowId);
  const [kind, setKind] = useState<EvidenceEntry["kind"]>(
    row?.method === "test"
      ? "execution"
      : row?.method === "not_applicable"
        ? "not_applicable"
        : "manual",
  );
  const [executionId, setExecutionId] = useState("");
  const [historical, setHistorical] = useState(false);
  const [reconfirmed, setReconfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [checkedContent, setCheckedContent] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [result, setResult] = useState<"passed" | "failed" | "blocked">(
    "passed",
  );
  const [reportedAt, setReportedAt] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [documentPage, setDocumentPage] = useState(1);
  const [prepared, setPrepared] = useState<{
    preview: EvidencePreview;
    data: EvidenceSelection;
    requestId: string;
  } | null>(null);
  const confirmation = useConfirmAction();
  const candidates = useInfiniteQuery({
    queryKey: [...c.queryScope, "submit-candidates", c.version, rowId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listCandidates(c.projectId, c.planId, {
        row_id: rowId,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: kind === "execution" && Boolean(rowId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const items = candidates.data?.pages.flatMap((p) => p.items) ?? [];
  const selected = items.find((i) => i.execution_id === executionId);
  const docs = useQuery({
    queryKey: [...c.queryScope, "evidence-documents", documentPage],
    queryFn: () =>
      listDocuments(c.projectId, { page: documentPage, page_size: 20 }),
    enabled: kind !== "execution" && c.documentAllowed,
    retry: false,
  });
  const attachments = useQuery<
    { id: string; filename: string; byte_size: number }[]
  >({
    queryKey: [
      ...c.queryScope,
      "evidence-files",
      kind,
      documentId,
      executionId,
    ],
    queryFn: () =>
      kind === "execution" && selected?.case_id && selected.execution_id
        ? listTestFiles(
            c.projectId,
            selected.design_id,
            selected.case_id,
            selected.execution_id,
          )
        : listAttachments(c.projectId, Number(documentId)),
    enabled:
      kind === "execution"
        ? Boolean(selected?.case_id && selected.execution_id)
        : c.documentAllowed && Boolean(documentId),
    retry: false,
  });
  const preview = useMutation({
    mutationFn: (data: EvidenceSelection) =>
      previewEvidence(c.projectId, c.planId, data),
    onSuccess: (value, data) =>
      setPrepared({ preview: value, data, requestId: crypto.randomUUID() }),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!prepared) throw new Error("先に内容を確認してください");
      return createEvidence(c.projectId, c.planId, {
        ...prepared.data,
        request_id: prepared.requestId,
        expected_preview_digest: prepared.preview.preview_digest,
      });
    },
    onSuccess: (value) => onCreated(value.id),
  });
  const valid = Boolean(
    rowId &&
    reason.trim() &&
    (kind === "execution"
      ? executionId &&
        reconfirmed &&
        (selected?.comparison === "same" || historical)
      : kind === "manual"
        ? checkedContent.trim() && actualResult.trim() && reportedAt
        : true),
  );
  const submitPreview = () => {
    const entry: EvidenceEntry = {
      id: crypto.randomUUID(),
      row_id: rowId,
      kind,
      reason,
      files,
    };
    if (kind === "execution")
      Object.assign(entry, {
        execution_id: executionId,
        use: historical ? "historical_record" : "current_candidate",
        reconfirmed,
      });
    if (kind === "manual")
      Object.assign(entry, {
        checked_content: checkedContent,
        actual_result: actualResult,
        result,
        reported_at: new Date(reportedAt).toISOString(),
      });
    preview.mutate({ plan_version: c.version, entries: [entry] });
  };
  const close = () => {
    if (save.isPending || preview.isPending) return;
    confirmation.confirm({
      title: "提出前の入力を閉じますか？",
      description:
        "まだ提出していない入力は保存されません。コピー中・保全完了の記録には影響しません。",
      confirmLabel: "入力を破棄して閉じる",
      onConfirm: onClose,
    });
  };
  const sourceLink = selected
    ? `/projects/joined/${c.projectId}/test-designs/${selected.design_id}?tab=cases&case=${selected.case_id}&verificationReturn=${encodeURIComponent(c.returnTo)}`
    : null;
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {prepared ? "提出内容の確認" : "証拠を提出する"}
            </DialogTitle>
            <DialogDescription>
              固定要件・確認表 {c.version}
              版へ提出します。1確認行ずつ追加でき、保全完了は要件の合格を意味しません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            {prepared ? (
              <>
                {prepared.preview.entries.map((e) => (
                  <section
                    key={evidenceText(e.id)}
                    className="flex flex-col gap-2"
                  >
                    <p className="font-medium">
                      {evidenceText(e.row_description)}
                    </p>
                    <p>
                      {evidenceKinds[evidenceText(e.kind)]} ·{" "}
                      {evidenceResults[evidenceText(e.result)] ??
                        "対象外の理由"}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {evidenceText(e.actual_result)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      対応・根拠：{evidenceText(e.reason)}
                    </p>
                    {e.kind === "execution" ? (
                      <p>
                        元の実行者：
                        {evidenceText(e.executed_by_name) || "記録なし"} ·
                        実行日時：
                        {e.executed_at
                          ? formatDateTime(evidenceText(e.executed_at))
                          : "記録なし"}
                      </p>
                    ) : null}
                    {e.reported_at ? (
                      <p>
                        申告した確認日時：
                        {formatDateTime(evidenceText(e.reported_at))}
                      </p>
                    ) : null}
                    <p>
                      今回の提出者・対応の確認者は、現在ログインしているあなたとして記録します。
                    </p>
                  </section>
                ))}
                <p>
                  選択ファイル {prepared.preview.files.length}件 ·{" "}
                  {(prepared.preview.total_bytes / 1048576).toFixed(2)} MiB
                </p>
                {prepared.preview.files.map((f) => (
                  <p className="break-words" key={evidenceText(f.id)}>
                    {evidenceText(f.filename)}
                  </p>
                ))}
                <Alert>
                  <AlertDescription>
                    {prepared.preview.warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="evidence-row">確認行</FieldLabel>
                  <Select
                    value={rowId}
                    onValueChange={(value) => {
                      setRowId(value);
                      const r = c.rows.find((r) => r.id === value);
                      setKind(
                        r?.method === "test"
                          ? "execution"
                          : r?.method === "not_applicable"
                            ? "not_applicable"
                            : "manual",
                      );
                      setExecutionId("");
                      setFiles([]);
                      setHistorical(false);
                      setReconfirmed(false);
                    }}
                  >
                    <SelectTrigger id="evidence-row">
                      <SelectValue placeholder="確認行を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {c.rows.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.description || "確認内容は未入力"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>提出する記録</FieldLabel>
                  <ToggleGroup
                    aria-label="提出する記録"
                    type="single"
                    variant="outline"
                    value={kind}
                    onValueChange={(value) => {
                      if (value) {
                        setKind(value as EvidenceEntry["kind"]);
                        setFiles([]);
                      }
                    }}
                  >
                    <ToggleGroupItem
                      value={row?.method === "test" ? "execution" : "manual"}
                      disabled={
                        row?.method === "not_applicable" || !row?.method
                      }
                    >
                      {row?.method === "test" ? "テスト実行" : "手動確認"}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="not_applicable">
                      理由付き対象外
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                {kind === "execution" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="evidence-execution">
                        ケースの直近実行
                      </FieldLabel>
                      {candidates.isError ? (
                        <DataLoadError
                          resourceName="実行候補"
                          onRetry={() => void candidates.refetch()}
                        />
                      ) : candidates.isPending ? (
                        <p>読込中…</p>
                      ) : (
                        <Select
                          value={executionId}
                          onValueChange={(value) => {
                            setExecutionId(value);
                            setFiles([]);
                            setReconfirmed(false);
                            setHistorical(false);
                          }}
                        >
                          <SelectTrigger id="evidence-execution">
                            <SelectValue placeholder="直近の実行を選んでください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {items
                                .filter((i) => i.execution_id)
                                .map((i) => (
                                  <SelectItem
                                    key={i.execution_id}
                                    value={i.execution_id!}
                                  >
                                    {i.item_title || "テスト項目"}{" "}
                                    {i.pattern_name} ·{" "}
                                    {evidenceResults[i.state] ?? i.state} ·{" "}
                                    {i.comparison === "same"
                                      ? "現在の内容と一致"
                                      : "内容変更あり"}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                      {candidates.hasNextPage ? (
                        <Button
                          variant="outline"
                          onClick={() => void candidates.fetchNextPage()}
                          disabled={candidates.isFetchingNextPage}
                        >
                          さらに候補を読む
                        </Button>
                      ) : null}
                      {!candidates.isPending &&
                      !items.some((i) => i.execution_id) ? (
                        <FieldDescription>
                          採用できる直近実行がありません。元のテスト画面で実行してください。
                        </FieldDescription>
                      ) : null}
                    </Field>
                    {selected ? (
                      <>
                        <Field>
                          <FieldLabel>今回の記録の扱い</FieldLabel>
                          <ToggleGroup
                            aria-label="今回の記録の扱い"
                            type="single"
                            variant="outline"
                            value={historical ? "historical" : "current"}
                            onValueChange={(v) => {
                              if (v) setHistorical(v === "historical");
                            }}
                          >
                            <ToggleGroupItem
                              value="current"
                              disabled={selected.comparison !== "same"}
                            >
                              現在のテスト内容への候補
                            </ToggleGroupItem>
                            <ToggleGroupItem value="historical">
                              過去内容の参考記録
                            </ToggleGroupItem>
                          </ToggleGroup>
                          {selected.comparison !== "same" ? (
                            <FieldDescription>
                              現在の内容と異なります。参考記録として明示選択した場合だけ提出できます。
                            </FieldDescription>
                          ) : null}
                        </Field>
                        <Field orientation="horizontal">
                          <Checkbox
                            id="evidence-reconfirm"
                            checked={reconfirmed}
                            onCheckedChange={(v) => setReconfirmed(v === true)}
                          />
                          <FieldLabel htmlFor="evidence-reconfirm">
                            この固定要件との対応を、今、自分で確認しました
                          </FieldLabel>
                        </Field>
                        {sourceLink ? (
                          <Button variant="outline" asChild>
                            <Link href={sourceLink}>
                              元の実行・添付を確認する
                            </Link>
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : kind === "manual" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="evidence-checked">
                        実際に確かめた内容
                      </FieldLabel>
                      <Textarea
                        id="evidence-checked"
                        value={checkedContent}
                        onChange={(e) => setCheckedContent(e.target.value)}
                        maxLength={4000}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="evidence-actual">
                        実際の結果
                      </FieldLabel>
                      <Textarea
                        id="evidence-actual"
                        value={actualResult}
                        onChange={(e) => setActualResult(e.target.value)}
                        maxLength={8000}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>確認結果</FieldLabel>
                      <ToggleGroup
                        aria-label="確認結果"
                        type="single"
                        variant="outline"
                        value={result}
                        onValueChange={(v) => {
                          if (v) setResult(v as typeof result);
                        }}
                      >
                        {["passed", "failed", "blocked"].map((r) => (
                          <ToggleGroupItem key={r} value={r}>
                            {evidenceResults[r]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="evidence-time">
                        自分が確認した日時（申告）
                      </FieldLabel>
                      <Input
                        id="evidence-time"
                        type="datetime-local"
                        value={reportedAt}
                        onChange={(e) => setReportedAt(e.target.value)}
                      />
                      <FieldDescription>
                        あなたを実施者として記録します。サーバーの受付日時は別に残ります。
                      </FieldDescription>
                    </Field>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      理由を確認したあなたと日時を残します。対象外を合格件数へ含めません。
                    </AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="evidence-reason">
                    {kind === "execution"
                      ? "固定要件との対応を確認した理由"
                      : kind === "manual"
                        ? "根拠・確認の経緯"
                        : "対象外と確認した理由"}
                  </FieldLabel>
                  <Textarea
                    id="evidence-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={4000}
                    required
                  />
                  <FieldDescription>
                    文章による根拠は必須、ファイルは任意です。
                  </FieldDescription>
                </Field>
                {kind !== "execution" && c.documentAllowed ? (
                  <Field>
                    <FieldLabel htmlFor="evidence-document">
                      添付を選ぶ文書（任意）
                    </FieldLabel>
                    {docs.isError ? (
                      <DataLoadError
                        resourceName="文書"
                        onRetry={() => void docs.refetch()}
                      />
                    ) : (
                      <>
                        <Select
                          value={documentId}
                          onValueChange={(value) => {
                            setDocumentId(value);
                            setFiles([]);
                          }}
                        >
                          <SelectTrigger id="evidence-document">
                            <SelectValue placeholder="既存の文書を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {docs.data?.items.map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                  {d.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={documentPage === 1}
                            onClick={() => setDocumentPage((p) => p - 1)}
                          >
                            前の文書
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              !docs.data || documentPage * 20 >= docs.data.total
                            }
                            onClick={() => setDocumentPage((p) => p + 1)}
                          >
                            次の文書
                          </Button>
                        </div>
                      </>
                    )}
                  </Field>
                ) : null}
                {!c.documentAllowed && kind !== "execution" ? (
                  <p className="text-sm text-muted-foreground">
                    文書添付の選択には文書の閲覧権限が必要です。文章による提出はできます。
                  </p>
                ) : null}
                {attachments.isFetching ? (
                  <p>添付を読込中…</p>
                ) : attachments.isError ? (
                  <DataLoadError
                    resourceName="添付"
                    onRetry={() => void attachments.refetch()}
                  />
                ) : attachments.data ? (
                  <FieldSet>
                    <FieldLegend>明示的に保全するファイル（任意）</FieldLegend>
                    <FieldDescription>
                      アップロードは既存の文書・テスト実行画面で行います。1件20MiB、合計100MiB・20件まで。
                    </FieldDescription>
                    {attachments.data.map((f) => (
                      <Field key={f.id} orientation="horizontal">
                        <Checkbox
                          id={`evidence-file-${f.id}`}
                          checked={files.some((x) => x.id === f.id)}
                          onCheckedChange={(v) =>
                            setFiles((previous) =>
                              v === true
                                ? [
                                    ...previous,
                                    {
                                      kind:
                                        kind === "execution"
                                          ? "test_evidence"
                                          : "document_attachment",
                                      id: f.id,
                                    },
                                  ]
                                : previous.filter((x) => x.id !== f.id),
                            )
                          }
                        />
                        <FieldLabel
                          htmlFor={`evidence-file-${f.id}`}
                          className="break-all"
                        >
                          {f.filename}{" "}
                          <Badge variant="secondary">
                            {(f.byte_size / 1048576).toFixed(2)} MiB
                          </Badge>
                        </FieldLabel>
                      </Field>
                    ))}
                    {attachments.data.length === 0 ? (
                      <p>この記録には添付がありません。</p>
                    ) : null}
                  </FieldSet>
                ) : null}
              </FieldGroup>
            )}
            <FormApiError error={preview.error ?? save.error} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={
                prepared
                  ? () => {
                      setPrepared(null);
                      save.reset();
                    }
                  : close
              }
              disabled={save.isPending || preview.isPending}
            >
              {prepared ? "入力へ戻る" : "閉じる"}
            </Button>
            {prepared ? (
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "提出中…" : "この内容を提出する"}
              </Button>
            ) : (
              <Button
                disabled={!valid || preview.isPending}
                onClick={submitPreview}
              >
                {preview.isPending ? "確認中…" : "提出前に内容を確認"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmation.confirmDialogProps} />
    </>
  );
}
