"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  TaskEstimateBaselineConfirm,
  TaskEstimateBaselineRead,
  TaskEstimateRevisionRead,
} from "@/lib/api/generated/model";
import {
  confirmTaskEstimateBaselineTasksTaskIdEstimateBaselinesPost,
  useGetTaskEstimateBaselinesTasksTaskIdEstimateBaselinesGet,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { formatEstimateHours } from "../../lib/task-effort";
import {
  estimateMethodLabels,
  estimateInputSummary,
} from "../../lib/task-estimate";

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "short",
});

export function TaskEstimateBaseline({
  active,
  taskId,
  title,
  canConfirm,
  estimate,
  getUserLabel,
  refreshEstimate,
}: {
  active: boolean;
  taskId: number;
  title: string;
  canConfirm: boolean;
  estimate: TaskEstimateRevisionRead;
  getUserLabel: (id: number) => string;
  refreshEstimate: () => Promise<unknown>;
}) {
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  const [attempt, setAttempt] = useState<{
    estimate: TaskEstimateRevisionRead;
    existing: TaskEstimateBaselineRead | null;
  }>();
  const cancel = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const query = useGetTaskEstimateBaselinesTasksTaskIdEstimateBaselinesGet(
    taskId,
    { page },
    { query: { enabled: active, retry: false } },
  );
  const baseline = query.data?.current;
  const normalizedCurrent = estimate.minutes ?? null;
  const baselineMinutes = baseline?.estimate.minutes ?? null;
  const difference =
    normalizedCurrent === null || baselineMinutes === null
      ? null
      : normalizedCurrent - baselineMinutes;
  const canSubmit =
    query.isSuccess &&
    !query.isFetching &&
    normalizedCurrent !== null &&
    estimate.task_version !== baseline?.estimate.task_version;
  const mutation = useMutation({
    mutationFn: (data: TaskEstimateBaselineConfirm) =>
      confirmTaskEstimateBaselineTasksTaskIdEstimateBaselinesPost(taskId, data),
    onSuccess: async () => {
      await Promise.all([query.refetch(), refreshEstimate()]);
      setAttempt(undefined);
      toast.success("基準見積を確定しました。");
    },
  });
  const conflict = getConflictCurrent(mutation.error);
  return (
    <section aria-label="基準見積" className="space-y-2 border-t pt-3">
      <h4 ref={heading} tabIndex={-1} className="font-medium">
        基準見積
      </h4>
      {query.isError && (
        <DataLoadError
          resourceName="基準見積"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.isPending && active && <p role="status">基準見積を取得中…</p>}
      {query.isSuccess && (
        <>
          <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
            <div>
              <dt className="text-xs text-muted-foreground">保存済み見積</dt>
              <dd>{formatEstimateHours(normalizedCurrent)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">基準</dt>
              <dd>{formatEstimateHours(baselineMinutes)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">基準との差</dt>
              <dd>
                {difference !== null && difference > 0 ? "+" : ""}
                {formatEstimateHours(difference)}
              </dd>
            </div>
          </dl>
          {baseline && (
            <p className="text-xs text-muted-foreground">
              {dateFormat.format(new Date(baseline.confirmed_at))} 確定
              {baseline.confirmed_by != null
                ? ` ・ ${getUserLabel(baseline.confirmed_by)}`
                : ""}
            </p>
          )}
        </>
      )}
      {canConfirm && query.isSuccess && (
        <Dialog
          open={Boolean(attempt)}
          onOpenChange={(open) => {
            if (open && canSubmit) {
              setReason("");
              mutation.reset();
              setAttempt({ estimate, existing: baseline ?? null });
            } else if (!open && !mutation.isPending) setAttempt(undefined);
          }}
        >
          <DialogTrigger asChild>
            <Button
              ref={trigger}
              type="button"
              size="sm"
              variant="outline"
              disabled={!canSubmit}
            >
              {baseline ? "基準見積を更新" : "基準見積を確定"}
            </Button>
          </DialogTrigger>
          {attempt && (
            <DialogContent
              showCloseButton={false}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancel.current?.focus();
              }}
              onCloseAutoFocus={(event) => {
                if (!trigger.current || trigger.current.disabled) {
                  event.preventDefault();
                  heading.current?.focus();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {attempt.existing ? "基準見積を更新" : "基準見積を確定"}
                </DialogTitle>
                <DialogDescription>
                  {title} の保存済み見積{" "}
                  {formatEstimateHours(attempt.estimate.minutes)}{" "}
                  を基準にします。
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (mutation.isPending || conflict) return;
                  mutation.mutate({
                    estimate_version: attempt.estimate.task_version,
                    expected_baseline_id: attempt.existing?.id ?? null,
                    reason: reason.trim() || null,
                  });
                }}
              >
                {attempt.existing && (
                  <p className="text-sm">
                    更新前の基準　
                    {formatEstimateHours(attempt.existing.estimate.minutes)}
                  </p>
                )}
                <label className="grid gap-1 text-sm">
                  確定理由（任意）
                  <Textarea
                    value={reason}
                    maxLength={500}
                    disabled={mutation.isPending}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <FormApiError error={mutation.error} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    ref={cancel}
                    type="button"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => setAttempt(undefined)}
                  >
                    キャンセル
                  </Button>
                  {conflict ? (
                    <Button
                      type="button"
                      onClick={async () => {
                        setAttempt(undefined);
                        await Promise.all([query.refetch(), refreshEstimate()]);
                      }}
                    >
                      最新の見積を確認
                    </Button>
                  ) : (
                    <Button type="submit" disabled={mutation.isPending}>
                      確定する
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          )}
        </Dialog>
      )}
      {query.data && query.data.total > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            確定履歴 {query.data.total}件
          </summary>
          <ul className="divide-y">
            {query.data.items.map((row) => (
              <li key={row.id} className="py-2 text-sm">
                <p>
                  {formatEstimateHours(row.estimate.minutes)}
                  {row.estimate.method &&
                    ` ・ ${estimateMethodLabels[row.estimate.method]}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="wrap-anywhere">
                    {estimateInputSummary(row.estimate)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFormat.format(new Date(row.confirmed_at))}
                  {row.confirmed_by != null &&
                    ` ・ ${getUserLabel(row.confirmed_by)}`}
                </p>
                {row.reason && (
                  <p className="whitespace-pre-wrap wrap-anywhere">
                    {row.reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {query.data.total > PAGE_SIZE && (
            <DataPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={query.data.total}
              currentCount={query.data.items.length}
              onPageChange={setPage}
            />
          )}
        </details>
      )}
    </section>
  );
}
