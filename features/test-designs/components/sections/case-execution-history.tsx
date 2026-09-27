"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaperclipIcon, UploadCloudIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteTestEvidenceProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsExecutionIdEvidenceEvidenceIdDelete as deleteEvidence,
  downloadTestEvidenceProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsExecutionIdEvidenceEvidenceIdDownloadGet as downloadEvidence,
  listTestEvidenceProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsExecutionIdEvidenceGet as listEvidence,
  listTestExecutionsProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsGet as listExecutions,
  uploadTestEvidenceProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsExecutionIdEvidencePost as uploadEvidence,
} from "@/lib/api/generated/test-collaboration/test-collaboration";
import { formatDateTime } from "@/lib/format/date";

import { useConfirmAction } from "../../hooks/use-confirm-action";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";

const labels: Record<string, string> = {
  not_run: "未実行",
  in_progress: "実施中",
  passed: "成功",
  failed: "失敗",
  blocked: "保留",
  not_applicable: "対象外",
};

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;
const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/json",
  "application/zip",
]);
type PendingFile = {
  id: string;
  file: File;
  state: "pending" | "uploading" | "failed";
  error?: string;
};

function EvidenceThumbnail({
  projectId,
  designId,
  caseId,
  executionId,
  evidenceId,
  name,
}: {
  projectId: number;
  designId: number;
  caseId: string;
  executionId: string;
  evidenceId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: [
      "test-evidence-url",
      projectId,
      designId,
      caseId,
      executionId,
      evidenceId,
    ],
    queryFn: () =>
      downloadEvidence(projectId, designId, caseId, executionId, evidenceId),
  });
  return (
    <>
      <button
        type="button"
        className="h-16 w-20 overflow-hidden rounded border bg-muted"
        aria-label={`${name}を拡大表示`}
        onClick={() => setOpen(true)}
      >
        {query.data?.url ? (
          // 署名付きURLは短期有効で、Next Imageの最適化キャッシュを経由しない。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={query.data.url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs">画像</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              実行 #{executionId.slice(0, 8)} のエビデンス
            </DialogDescription>
          </DialogHeader>
          {query.data?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={query.data.url}
              alt={name}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EvidenceFiles({
  projectId,
  designId,
  caseId,
  executionId,
  editable,
}: {
  projectId: number;
  designId: number;
  caseId: string;
  executionId: string;
  editable: boolean;
}) {
  const client = useQueryClient();
  const { confirm, confirmDialogProps } = useConfirmAction();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = ["test-evidence", projectId, designId, caseId, executionId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listEvidence(projectId, designId, caseId, executionId),
  });
  async function refresh() {
    await client.invalidateQueries({ queryKey: key });
    await client.invalidateQueries({
      queryKey: ["test-executions", projectId, designId, caseId],
    });
  }
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エビデンスを操作できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  function addFiles(files: File[]) {
    const available = MAX_FILES - (query.data?.length ?? 0) - pending.length;
    if (files.length > available) {
      toast.error(`1回の実行に添付できるファイルは${MAX_FILES}件までです`);
    }
    const valid = files.slice(0, Math.max(0, available)).filter((file) => {
      if (file.size > MAX_BYTES || !allowedTypes.has(file.type)) {
        toast.error(`${file.name}: 形式またはサイズを確認してください`);
        return false;
      }
      return true;
    });
    setPending((current) => [
      ...current,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        state: "pending" as const,
      })),
    ]);
  }
  async function uploadPending() {
    const targets = pending.filter((item) => item.state !== "uploading");
    if (!targets.length) return;
    setBusy(true);
    for (const item of targets) {
      setPending((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, state: "uploading" } : entry,
        ),
      );
      try {
        await uploadEvidence(projectId, designId, caseId, executionId, {
          file: item.file,
        });
        setPending((current) =>
          current.filter((entry) => entry.id !== item.id),
        );
      } catch (error) {
        setPending((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  state: "failed",
                  error:
                    error instanceof Error
                      ? error.message
                      : "アップロードできませんでした",
                }
              : entry,
          ),
        );
      }
    }
    await refresh();
    setBusy(false);
  }
  return (
    <div className="space-y-2 border-t pt-2 text-sm">
      <p className="font-medium">エビデンス {query.data?.length ?? 0}件</p>
      {query.isLoading && <p className="text-muted-foreground">読み込み中…</p>}
      {query.error && <p role="alert">エビデンスを読み込めませんでした。</p>}
      {query.data?.map((evidence) => (
        <div
          key={evidence.id}
          className="flex flex-wrap items-center gap-3 rounded border p-2"
        >
          {evidence.content_type.startsWith("image/") && (
            <EvidenceThumbnail
              projectId={projectId}
              designId={designId}
              caseId={caseId}
              executionId={executionId}
              evidenceId={evidence.id}
              name={evidence.filename}
            />
          )}
          <button
            type="button"
            className="max-w-64 break-all text-left underline"
            onClick={async () => {
              const tab = window.open("", "_blank");
              try {
                const result = await downloadEvidence(
                  projectId,
                  designId,
                  caseId,
                  executionId,
                  evidence.id,
                );
                if (tab) tab.location.href = result.url;
                else window.location.href = result.url;
              } catch (error) {
                tab?.close();
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "ファイルを開けませんでした",
                );
              }
            }}
          >
            {evidence.filename}
          </button>
          <span className="text-xs text-muted-foreground">
            {evidence.content_type} · {Math.ceil(evidence.byte_size / 1024)} KB
            · {evidence.uploaded_by_name ?? `ユーザー ${evidence.uploaded_by}`}{" "}
            · {formatDateTime(evidence.uploaded_at)}
          </span>
          {editable && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                confirm({
                  title: "エビデンスを削除しますか？",
                  description: `「${evidence.filename}」を一覧から削除します。`,
                  confirmLabel: "削除",
                  destructive: true,
                  onConfirm: () =>
                    void run(() =>
                      deleteEvidence(
                        projectId,
                        designId,
                        caseId,
                        executionId,
                        evidence.id,
                      ),
                    ),
                })
              }
            >
              削除
            </Button>
          )}
        </div>
      ))}
      {editable && (
        <div
          tabIndex={0}
          role="button"
          aria-label="エビデンスを追加。クリック、ドロップ、または画像を貼り付け"
          className={`space-y-2 rounded-lg border-2 border-dashed p-5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring ${dragging ? "border-primary bg-accent" : "border-muted-foreground/40"}`}
          onClick={(event) => {
            if (event.target !== fileInput.current) fileInput.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(Array.from(event.dataTransfer.files));
          }}
          onPaste={(event) => {
            const images = Array.from(event.clipboardData.files)
              .filter((file) => file.type.startsWith("image/"))
              .map((file, index) => {
                const extension =
                  file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
                return new File(
                  [file],
                  `screenshot-${Date.now()}-${index + 1}.${extension}`,
                  { type: file.type },
                );
              });
            if (images.length) {
              event.preventDefault();
              addFiles(images);
            }
          }}
        >
          <UploadCloudIcon className="mx-auto size-7" aria-hidden="true" />
          <p className="font-medium">
            <PaperclipIcon className="mr-1 inline size-4" />
            ファイルをここに追加
          </p>
          <p className="text-muted-foreground">
            クリックして選択・ドラッグ＆ドロップ・画像を貼り付け
          </p>
          <p className="text-xs text-muted-foreground">
            1件20MBまで / 1回20件まで
          </p>
          <input
            ref={fileInput}
            type="file"
            aria-label="エビデンスを選択"
            className="sr-only"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.json,.zip"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      )}
      {editable && pending.length > 0 && (
        <div className="space-y-2 rounded border p-3">
          <p className="font-medium">添付予定 {pending.length}件</p>
          {pending.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2">
              <span className="break-all">{item.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {item.state === "uploading"
                  ? "アップロード中"
                  : item.state === "failed"
                    ? `失敗: ${item.error}`
                    : "添付前"}
              </span>
              {!busy && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPending((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    )
                  }
                >
                  取り消す
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void uploadPending()}
          >
            {busy ? "添付中…" : "まとめて添付"}
          </Button>
        </div>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

export function CaseExecutionHistory({
  projectId,
  designId,
  caseId,
  version,
  editable,
  initialExecutionId,
}: {
  projectId: number;
  designId: number;
  caseId: string;
  version: number;
  editable: boolean;
  initialExecutionId?: string;
}) {
  const query = useQuery({
    queryKey: ["test-executions", projectId, designId, caseId, version],
    queryFn: () => listExecutions(projectId, designId, caseId),
  });
  useEffect(() => {
    if (
      !initialExecutionId ||
      !query.data?.some((row) => row.id === initialExecutionId)
    )
      return;
    document
      .getElementById(`test-execution-${initialExecutionId}`)
      ?.scrollIntoView({ block: "center" });
  }, [initialExecutionId, query.data]);
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">実行履歴</h3>
      {query.isLoading && <p className="text-sm">読み込み中…</p>}
      {query.error && (
        <p role="alert" className="text-sm">
          実行履歴を読み込めませんでした。
        </p>
      )}
      {query.data && !query.data.length && (
        <p className="text-sm text-muted-foreground">
          実行結果を保存すると履歴が作成されます。
        </p>
      )}
      {query.data?.map((execution, index) => (
        <div
          key={execution.id}
          id={`test-execution-${execution.id}`}
          className={`space-y-2 rounded-md border p-3 text-sm ${initialExecutionId === execution.id ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <p className="font-medium">
            実行 #{execution.run_number} ·{" "}
            {labels[execution.status] ?? execution.status}
            {index === 0 ? " · 最新" : " · 過去"}
          </p>
          <p className="text-xs text-muted-foreground">
            {execution.executed_by_name ?? "実行者不明"} ·{" "}
            {formatDateTime(execution.executed_at)}
          </p>
          <p className="whitespace-pre-wrap">
            実際の結果: {execution.actual_result || "－"}
          </p>
          {execution.notes && (
            <p className="whitespace-pre-wrap">備考: {execution.notes}</p>
          )}
          <EvidenceFiles
            projectId={projectId}
            designId={designId}
            caseId={caseId}
            executionId={execution.id}
            editable={editable && index === 0}
          />
        </div>
      ))}
    </section>
  );
}
