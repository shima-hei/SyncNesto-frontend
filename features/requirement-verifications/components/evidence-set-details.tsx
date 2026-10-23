"use client";

import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { useConfirmAction } from "@/features/test-designs/hooks/use-confirm-action";
import { formatDateTime } from "@/lib/format/date";
import {
  getEvidence,
  getEvidenceEntry,
  advanceEvidence,
  cancelEvidence,
  cleanupEvidence,
  downloadEvidence,
} from "../lib/evidence-api";
import {
  evidenceText as text,
  evidenceStates,
  evidenceKinds,
  evidenceResults,
  evidenceComparison,
} from "../lib/evidence";
import { EvidenceRecord } from "./evidence-record";

export function EvidenceSetDetails({
  projectId,
  planId,
  id,
  queryScope,
  onClose,
}: {
  projectId: number;
  planId: string;
  id: string;
  queryScope: (string | number | undefined)[];
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [entryId, setEntryId] = useState<string | null>(null);
  const confirmation = useConfirmAction();
  const query = useInfiniteQuery({
    queryKey: [...queryScope, "set", id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getEvidence(projectId, planId, id, { cursor: pageParam }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const detail = query.data?.pages[0];
  const entry = useQuery({
    queryKey: [...queryScope, "entry", id, entryId],
    queryFn: () => getEvidenceEntry(projectId, planId, id, entryId!),
    enabled: Boolean(entryId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const action = useMutation({
    mutationFn: (kind: "advance" | "cancel" | "cleanup") => {
      if (!detail) throw new Error("最新の状態を確認してください");
      const fn =
        kind === "advance"
          ? advanceEvidence
          : kind === "cancel"
            ? cancelEvidence
            : cleanupEvidence;
      return fn(projectId, planId, id, { version: detail.version });
    },
    onSuccess: async (value, kind) => {
      await client.invalidateQueries({ queryKey: queryScope });
      if (kind === "cleanup" && value.safe_error === "cleanup_retry_required") {
        toast.error(
          "回収できない試行があります。状態を確認して再走査してください。",
        );
        return;
      }
      toast.success(
        kind === "cleanup"
          ? "回収を再確認しました。遅れて届くコピーは再走査が必要です。"
          : "保全状態を更新しました",
      );
    },
  });
  const download = useMutation({
    mutationFn: (fileId: string) =>
      downloadEvidence(projectId, planId, id, fileId),
    onSuccess: (value) => {
      const link = document.createElement("a");
      link.href = value.url;
      link.referrerPolicy = "no-referrer";
      link.rel = "noreferrer";
      link.download = "";
      link.click();
    },
  });
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !action.isPending) onClose();
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>提出した証拠と保全状況</DialogTitle>
            <DialogDescription>
              保存した記録と現在との比較を分けて表示します。保全完了は要件の合格ではありません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            {query.isError ? (
              <DataLoadError
                resourceName="保全記録"
                onRetry={() => void query.refetch()}
              />
            ) : !detail ? (
              <p>読込中…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      detail.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {evidenceStates[detail.status]}
                  </Badge>
                  <span>確認表 {detail.plan_version}版</span>
                  <span>
                    {detail.verified_files}/{detail.file_count}ファイル検証済み
                  </span>
                </div>
                <p>
                  提出者：{detail.actor_name} · 受付：
                  {formatDateTime(detail.created_at)}
                </p>
                {detail.completed_at ? (
                  <p>保全完了：{formatDateTime(detail.completed_at)}</p>
                ) : null}
                <Alert>
                  <AlertDescription>
                    <p>
                      現在の要件本文：
                      {evidenceComparison(detail.comparison.requirement)} ·
                      確認表：{evidenceComparison(detail.comparison.checklist)}{" "}
                      · 元の記録：
                      {evidenceComparison(detail.comparison.sources)}
                    </p>
                    <p>
                      変更・回収後も保存済みの証拠は書き換えません。別の確認表版へ自動引継ぎしません。
                    </p>
                  </AlertDescription>
                </Alert>
                {detail.safe_error ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {detail.safe_error === "source_changed"
                        ? "コピー中に元の内容が変わりました。新しい提出で再確認してください。"
                        : "コピーを完了できませんでした。元ファイルと資格を確認して再開してください。"}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {typeof detail.comparison.cleanup_pending === "number" &&
                detail.comparison.cleanup_pending > 0 ? (
                  <Alert>
                    <AlertDescription>
                      未採用コピーに、回収未確認または再試行が必要な試行が
                      {detail.comparison.cleanup_pending}
                      件あります。遅れて届くコピーの再走査もできます。
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {detail.can_operate &&
                  ["preparing", "failed"].includes(detail.status) ? (
                    <>
                      <Button
                        disabled={action.isPending}
                        onClick={() => action.mutate("advance")}
                      >
                        {action.isPending
                          ? "処理中…"
                          : "次の1ファイルを保全する"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          confirmation.confirm({
                            title: "未完のコピーを取り消しますか？",
                            description:
                              "提出記録は残ります。保全完了した証拠や元ファイルは削除しません。",
                            confirmLabel: "未完コピーを取り消す",
                            onConfirm: () =>
                              action
                                .mutateAsync("cancel")
                                .then(() => undefined),
                          })
                        }
                      >
                        未完コピーを取り消す
                      </Button>
                    </>
                  ) : null}
                  {detail.can_operate ? (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => action.mutate("cleanup")}
                    >
                      未採用コピーの回収を再確認
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                  >
                    状態を更新
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  1操作で1ファイルずつ進み、閉じた後も再開できます。回収は後から再走査できます。発行済みDLリンクは最大60秒有効です。
                </p>
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">保全する記録</h3>
                  {query.data?.pages
                    .flatMap((p) => p.entries)
                    .map((e) => (
                      <Button
                        key={text(e.id)}
                        variant="outline"
                        className="h-auto justify-start whitespace-normal text-left"
                        onClick={() => setEntryId(text(e.id))}
                      >
                        {text(e.row_description) || "確認行"} ·{" "}
                        {evidenceKinds[text(e.kind)]} ·{" "}
                        {evidenceResults[text(e.result)] ?? "対象外の理由"}
                      </Button>
                    ))}
                  {query.hasNextPage ? (
                    <Button
                      variant="outline"
                      disabled={query.isFetchingNextPage}
                      onClick={() => void query.fetchNextPage()}
                    >
                      次の記録
                    </Button>
                  ) : null}
                </section>
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">選択したファイル</h3>
                  {detail.files.length ? (
                    detail.files.map((f) => (
                      <div
                        key={text(f.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="min-w-0 break-all">
                          {text(f.filename)}
                        </span>
                        {detail.status === "ready" && f.file_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={download.isPending}
                            onClick={() => download.mutate(text(f.file_id))}
                          >
                            保全ファイルをダウンロード
                          </Button>
                        ) : null}
                        {f.sha256 ? (
                          <details className="w-full break-all text-xs text-muted-foreground">
                            <summary>保全時のファイルhash</summary>
                            {text(f.sha256)}
                          </details>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p>添付なしの文章による記録です。</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    hashは保全時のbytesの同一性です。実行当時のbytesを遡って証明しません。
                  </p>
                </section>
                {entryId ? (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium">選択した根拠</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEntryId(null)}
                      >
                        根拠を閉じる
                      </Button>
                    </div>
                    {entry.isError ? (
                      <DataLoadError
                        resourceName="固定した根拠"
                        onRetry={() => void entry.refetch()}
                      />
                    ) : entry.data ? (
                      <EvidenceRecord value={entry.data} />
                    ) : (
                      <p>読込中…</p>
                    )}
                  </section>
                ) : null}
                <FormApiError error={action.error ?? download.error} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmation.confirmDialogProps} />
    </>
  );
}
