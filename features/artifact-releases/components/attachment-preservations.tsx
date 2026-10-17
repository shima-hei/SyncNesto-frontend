"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import type {
  DocumentAttachmentRead,
  PreservationPreview,
  PreservationRead,
  PreservationSource,
} from "@/lib/api/generated/model";
import {
  advancePreservation,
  cleanupPreservation,
  downloadFile,
  listAttachments,
  listDocuments,
  listPreservations,
  previewPreservation,
  reservePreservation,
} from "../lib/api";
import { displayBytes, displayDate } from "../lib/display";

type Choice = PreservationSource & { filename: string; byte_size: number };
const statuses = {
  preparing: "準備中",
  ready: "保全完了",
  failed: "再試行が必要",
  cancelled: "準備を取消済み",
};

export function AttachmentPreservations({
  projectId,
  releaseId,
}: {
  projectId: number;
  releaseId: string;
}) {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [documentPage, setDocumentPage] = useState(1);
  const [documentId, setDocumentId] = useState(0);
  const [page, setPage] = useState(1);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [confirmed, setConfirmed] = useState<{
    value: PreservationPreview;
    requestId: string;
  } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const docs = useQuery({
    queryKey: ["preservation-documents", projectId, search, documentPage],
    queryFn: () =>
      listDocuments(projectId, {
        page: documentPage,
        page_size: 20,
        q: search || undefined,
      }),
    retry: false,
  });
  const files = useQuery({
    queryKey: ["preservation-source-files", projectId, documentId],
    queryFn: () => listAttachments(projectId, documentId),
    enabled: documentId > 0,
    retry: false,
  });
  const jobs = useQuery({
    queryKey: ["attachment-preservations", projectId, releaseId, page],
    queryFn: () =>
      listPreservations(projectId, releaseId, { page, page_size: 20 }),
    retry: false,
  });
  const refresh = () =>
    cache.invalidateQueries({
      queryKey: ["attachment-preservations", projectId, releaseId],
    });
  const preview = useMutation({
    mutationFn: () =>
      previewPreservation(projectId, releaseId, {
        attachments: choices.map(({ document_id, attachment_id }) => ({
          document_id,
          attachment_id,
        })),
      }),
    onSuccess: (value) =>
      setConfirmed({ value, requestId: crypto.randomUUID() }),
  });
  const reserve = useMutation({
    mutationFn: () =>
      reservePreservation(projectId, releaseId, {
        attachments: confirmed!.value.files.map(
          ({ document_id, attachment_id }) => ({ document_id, attachment_id }),
        ),
        request_id: confirmed!.requestId,
        expected_plan_digest: confirmed!.value.plan_digest,
      }),
    onSuccess: async () => {
      setConfirmed(null);
      setChoices([]);
      setPage(1);
      await refresh();
      toast.success(
        "添付の保全準備を保存しました。続けて保全を開始してください。",
      );
    },
  });
  const process = useMutation({
    mutationFn: async (row: PreservationRead) => {
      setActive(row.id);
      try {
        for (let step = 0; step < 20; step++) {
          const result = await advancePreservation(
            projectId,
            releaseId,
            row.id,
          );
          await refresh();
          if (result.status === "ready") return;
          if (result.status !== "preparing")
            throw new Error("preparation stopped");
        }
      } finally {
        setActive(null);
        await refresh();
      }
    },
    onSuccess: () => toast.success("添付の保全が完了しました。"),
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          "保全が中断しました。準備一覧から再開してください。",
        ),
      ),
  });
  function toggle(file: DocumentAttachmentRead, checked: boolean) {
    setConfirmed(null);
    preview.reset();
    reserve.reset();
    setChoices((current) =>
      checked
        ? [
            ...current,
            {
              document_id: documentId,
              attachment_id: file.id,
              filename: file.filename,
              byte_size: file.byte_size,
            },
          ]
        : current.filter((item) => item.attachment_id !== file.id),
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>2. 固定版に残す添付を選ぶ</CardTitle>
          <CardDescription>
            プロジェクト資料の添付を最大20件選べます。本文の保存時点と、ここで選ぶ添付の時点は別です。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="preservation-document-search">
                資料を検索
              </FieldLabel>
              <Input
                id="preservation-document-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setDocumentPage(1);
                }}
                placeholder="資料名"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="preservation-document">
                添付を確認する資料
              </FieldLabel>
              <Select
                value={documentId ? String(documentId) : ""}
                onValueChange={(value) => setDocumentId(Number(value))}
              >
                <SelectTrigger id="preservation-document">
                  <SelectValue placeholder="資料を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {docs.data?.items.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {docs.error ? (
            <DataLoadError
              resourceName="資料"
              onRetry={() => void docs.refetch()}
            />
          ) : docs.isPending ? (
            <Skeleton className="h-10" />
          ) : (
            <DataPagination
              page={documentPage}
              pageSize={20}
              total={docs.data.total}
              currentCount={docs.data.items.length}
              onPageChange={setDocumentPage}
            />
          )}
          {documentId > 0 ? (
            files.isPending ? (
              <Skeleton className="h-20" />
            ) : files.error ? (
              <DataLoadError
                resourceName="資料の添付"
                onRetry={() => void files.refetch()}
              />
            ) : files.data.length ? (
              <FieldSet>
                <FieldLegend>この資料の添付</FieldLegend>
                <FieldDescription>
                  元ファイルの内容が読み出せるかは保全処理で確認します。
                </FieldDescription>
                <FieldGroup>
                  {files.data.map((file) => {
                    const checked = choices.some(
                      (choice) => choice.attachment_id === file.id,
                    );
                    return (
                      <Field key={file.id} orientation="horizontal">
                        <Checkbox
                          id={`attachment-${file.id}`}
                          checked={checked}
                          disabled={!checked && choices.length >= 20}
                          onCheckedChange={(value) =>
                            toggle(file, value === true)
                          }
                        />
                        <FieldLabel
                          htmlFor={`attachment-${file.id}`}
                          className="min-w-0 break-all"
                        >
                          {file.filename}（{displayBytes(file.byte_size)}）
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </FieldGroup>
              </FieldSet>
            ) : (
              <p className="text-sm text-muted-foreground">
                この資料に添付はありません。
              </p>
            )
          ) : null}
          {choices.length ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                選択中 {choices.length} / 20件
              </p>
              <ul className="flex flex-col gap-2">
                {choices.map((choice) => (
                  <li
                    key={choice.attachment_id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="break-all">{choice.filename}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setChoices((current) =>
                          current.filter(
                            (item) =>
                              item.attachment_id !== choice.attachment_id,
                          ),
                        );
                        setConfirmed(null);
                      }}
                    >
                      選択解除
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <Button
              variant="outline"
              disabled={
                !choices.length || preview.isPending || reserve.isPending
              }
              onClick={() => {
                setConfirmed(null);
                reserve.reset();
                preview.mutate();
              }}
            >
              {preview.isPending ? <Spinner data-icon="inline-start" /> : null}
              選択した添付を確認
            </Button>
          </div>
          <FormApiError error={preview.error} />
          {confirmed ? (
            <div className="flex flex-col gap-3" aria-live="polite">
              <p className="text-sm">
                {confirmed.value.files.length}件・
                {displayBytes(confirmed.value.total_bytes)}を保全します。
              </p>
              <div>
                <Button
                  disabled={reserve.isPending}
                  onClick={() => reserve.mutate()}
                >
                  {reserve.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  この構成で保全準備を保存
                </Button>
              </div>
              <FormApiError error={reserve.error} />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>添付の保全状況</CardTitle>
          <CardDescription>
            すべての添付のコピーと内容照合が完了するとダウンロードできます。途中で閉じても、この一覧から再開できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {jobs.isPending ? (
            <Skeleton className="h-24" />
          ) : jobs.error ? (
            <DataLoadError
              resourceName="添付の保全状況"
              onRetry={() => void jobs.refetch()}
            />
          ) : !jobs.data.items.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>添付の保全準備はまだありません</EmptyTitle>
                <EmptyDescription>
                  上で残す添付を選んでください。本文だけの固定版としても確認できます。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {jobs.data.items.map((row) => (
                <PreservationJob
                  key={row.id}
                  row={row}
                  projectId={projectId}
                  releaseId={releaseId}
                  active={active === row.id}
                  busy={process.isPending}
                  onAdvance={() => process.mutate(row)}
                  onChanged={refresh}
                />
              ))}
              <DataPagination
                page={page}
                pageSize={20}
                total={jobs.data.total}
                currentCount={jobs.data.items.length}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function PreservationJob({
  row,
  projectId,
  releaseId,
  active,
  busy,
  onAdvance,
  onChanged,
}: {
  row: PreservationRead;
  projectId: number;
  releaseId: string;
  active: boolean;
  busy: boolean;
  onAdvance: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cleanup = useMutation({
    mutationFn: (cancel: boolean) =>
      cleanupPreservation(projectId, releaseId, row.id, {
        cancel_preparation: cancel,
      }),
    onSuccess: async () => {
      setConfirmCancel(false);
      await onChanged();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const download = useMutation({
    mutationFn: (id: string) => downloadFile(projectId, releaseId, row.id, id),
    onSuccess: (value) => window.location.assign(value.url),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return (
    <article className="flex min-w-0 flex-col gap-3 border-b pb-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={row.status === "ready" ? "default" : "secondary"}>
          {statuses[row.status]}
        </Badge>
        <span className="text-sm">
          {row.copied_count} / {row.files.length}件・
          {displayDate(row.created_at)}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {row.files.map((file) => (
          <li
            key={file.file_id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="break-all text-sm">
                {file.filename}（{displayBytes(file.byte_size)}）
              </p>
              <p className="text-xs text-muted-foreground">
                {file.copied ? "内容照合済み" : "未完了"}
              </p>
              {file.content_digest ? (
                <details className="text-xs text-muted-foreground">
                  <summary>内容のハッシュを確認</summary>
                  <p className="break-all">SHA-256: {file.content_digest}</p>
                </details>
              ) : null}
            </div>
            {row.status === "ready" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={download.isPending}
                onClick={() => download.mutate(file.file_id)}
              >
                <DownloadIcon data-icon="inline-start" />
                ダウンロード
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {row.status === "failed" ? (
        <p role="status" className="text-sm">
          保全が中断しています。元の添付が読み出せる状態か確認してから再試行してください。
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {["preparing", "failed"].includes(row.status) ? (
          <>
            <Button disabled={busy || cleanup.isPending} onClick={onAdvance}>
              {active ? <Spinner data-icon="inline-start" /> : null}
              {active
                ? "添付を保全中"
                : row.copied_count || row.status === "failed"
                  ? "保全を再開"
                  : "添付の保全を開始"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || cleanup.isPending}
              onClick={() => setConfirmCancel(true)}
            >
              準備を取り消す
            </Button>
          </>
        ) : null}
        {row.cleanup_pending > 0 ? (
          <Button
            variant="outline"
            disabled={cleanup.isPending || busy}
            onClick={() => cleanup.mutate(false)}
          >
            失敗した作業ファイルを回収
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="添付の保全準備を取り消しますか？"
        description="この準備の作業用コピーを回収します。元の添付と固定した本文は残ります。"
        confirmLabel="準備を取り消す"
        destructive
        isPending={cleanup.isPending}
        onConfirm={() => cleanup.mutateAsync(true).then(() => undefined)}
      />
    </article>
  );
}
