"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  passed: "成功",
  failed: "失敗",
  blocked: "保留",
  not_applicable: "対象外",
};

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
  const [file, setFile] = useState<File | null>(null);
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
      setFile(null);
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
  return (
    <div className="space-y-2 border-t pt-2 text-sm">
      <p className="font-medium">エビデンス {query.data?.length ?? 0}件</p>
      {query.data?.map((evidence) => (
        <div key={evidence.id} className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="underline"
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
            {Math.ceil(evidence.byte_size / 1024)} KB
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
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (file)
              void run(() =>
                uploadEvidence(projectId, designId, caseId, executionId, {
                  file,
                }),
              );
          }}
        >
          <input
            type="file"
            aria-label="エビデンスを選択"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.json,.zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button size="sm" type="submit" disabled={!file || busy}>
            添付
          </Button>
          <span className="text-xs text-muted-foreground">
            1件20MB・1回20件まで
          </span>
        </form>
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
}: {
  projectId: number;
  designId: number;
  caseId: string;
  version: number;
  editable: boolean;
}) {
  const query = useQuery({
    queryKey: ["test-executions", projectId, designId, caseId, version],
    queryFn: () => listExecutions(projectId, designId, caseId),
  });
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
          className="space-y-2 rounded-md border p-3 text-sm"
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
