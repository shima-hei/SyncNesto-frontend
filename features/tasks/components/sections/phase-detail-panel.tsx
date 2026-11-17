"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
  PhaseAssignment,
  PhaseRead,
  PhaseUpdateColor,
} from "@/lib/api/generated/model";
import {
  archivePhaseWithTransferProjectsProjectIdPhasesPhaseIdArchiveWithTransferPost,
  transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost,
  usePreviewPhaseArchiveProjectsProjectIdPhasesPhaseIdArchivePreviewGet,
} from "@/lib/api/generated/phase-transfers/phase-transfers";
import {
  updatePhaseProjectsProjectIdPhasesPhaseIdPatch,
  useListTasksProjectsProjectIdTasksGet,
} from "@/lib/api/generated/tasks/tasks";
import { getConflictCurrent } from "@/lib/api/conflict";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { phaseColors } from "../../lib/phase-colors";

const selectClass = "h-8 w-full rounded-md border bg-background px-2 text-sm";
const pageSize = 20;

function destinations(phases: PhaseRead[], from: PhaseAssignment) {
  const options: { key: string; label: string; assignment: PhaseAssignment }[] =
    [
      {
        key: "unclassified",
        label: "未分類",
        assignment: { kind: "unclassified" },
      },
      { key: "shared", label: "共通作業", assignment: { kind: "shared" } },
      ...phases
        .filter((phase) => !phase.archived_at)
        .map((phase) => ({
          key: `phase:${phase.id}`,
          label: phase.name,
          assignment: { kind: "phase" as const, phase_id: phase.id },
        })),
    ];
  return options.filter(
    ({ assignment }) =>
      assignment.kind !== from.kind || assignment.phase_id !== from.phase_id,
  );
}

export function PhaseDetailPanel({
  active,
  projectId,
  selection,
  phase,
  phases,
  canManage,
  canUpdate,
  onClose,
}: {
  active: boolean;
  projectId: number;
  selection: PhaseAssignment;
  phase?: PhaseRead;
  phases: PhaseRead[];
  canManage: boolean;
  canUpdate: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [destinationKey, setDestinationKey] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const list = useListTasksProjectsProjectIdTasksGet(
    projectId,
    {
      phase_scope: selection.kind,
      phase_id: selection.phase_id ?? undefined,
      page,
      page_size: pageSize,
    },
    { query: { enabled: active, retry: false } },
  );
  const choices = destinations(phases, selection);
  const target = choices.find(({ key }) => key === destinationKey);
  const selectedTasks = Object.entries(selected).map(([id, version]) => ({
    id: Number(id),
    version,
  }));
  const move = useMutation({
    mutationFn: (destination: PhaseAssignment) =>
      transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost(projectId, {
        tasks: selectedTasks,
        destination,
      }),
    onSuccess: async ({ moved_count }) => {
      setSelected({});
      setDestinationKey("");
      setPage(1);
      await invalidateTaskProjectSurfaces(client, projectId, {
        includeBoard: true,
      });
      toast.success(`${moved_count}件の所属を変更しました。`);
    },
  });
  const label =
    phase?.name ?? (selection.kind === "shared" ? "共通作業" : "未分類");
  return (
    <aside
      aria-label={`${label}の詳細`}
      className="min-w-0 space-y-4 rounded-md border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 font-medium wrap-anywhere">{label}</h3>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="工程の詳細を閉じる"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      {phase &&
        (canManage ? (
          <PhaseDetailsForm projectId={projectId} phase={phase} />
        ) : (
          phase.description && (
            <p className="text-sm whitespace-pre-wrap wrap-anywhere">
              {phase.description}
            </p>
          )
        ))}
      <section aria-label="所属タスク" className="space-y-2">
        <h4 className="font-medium">
          所属タスク{list.data ? ` ${list.data.total}件` : ""}
        </h4>
        {list.isError ? (
          <DataLoadError
            resourceName="所属タスク"
            isRetrying={list.isFetching}
            onRetry={() => void list.refetch()}
          />
        ) : null}
        {list.isPending && active ? (
          <p role="status" className="text-sm text-muted-foreground">
            所属タスクを取得中…
          </p>
        ) : null}
        {list.data?.total === 0 && (
          <p className="text-sm text-muted-foreground">
            所属タスクはありません。
          </p>
        )}
        <ul className="divide-y">
          {list.data?.items.map((task) => (
            <li key={task.id} className="flex items-start gap-2 py-2">
              {canUpdate && (
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  aria-label={`${task.title}を選択`}
                  checked={Object.hasOwn(selected, task.id)}
                  disabled={
                    move.isPending ||
                    (selectedTasks.length >= 100 &&
                      !Object.hasOwn(selected, task.id))
                  }
                  onChange={(event) => {
                    const next = { ...selected };
                    if (event.target.checked) next[task.id] = task.version;
                    else delete next[task.id];
                    setSelected(next);
                    move.reset();
                  }}
                />
              )}
              <Link
                href={`/projects/joined/${projectId}/tasks/${task.id}`}
                className="min-w-0 text-sm wrap-anywhere hover:underline"
              >
                {task.title}{" "}
                <span className="text-xs text-muted-foreground">
                  {task.task_code}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {list.data && list.data.total > pageSize && (
          <DataPagination
            page={page}
            pageSize={pageSize}
            total={list.data.total}
            currentCount={list.data.items.length}
            onPageChange={setPage}
          />
        )}
        {canUpdate && selectedTasks.length > 0 && (
          <form
            className="space-y-2 border-t pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (target && !move.isPending) move.mutate(target.assignment);
            }}
          >
            <label className="grid gap-1 text-sm">
              {selectedTasks.length}件の移動先
              <select
                className={selectClass}
                value={destinationKey}
                onChange={(event) => setDestinationKey(event.target.value)}
                required
              >
                <option value="">移動先を選択</option>
                {choices.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="submit"
                disabled={!target || move.isPending}
              >
                所属を変更
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                disabled={move.isPending}
                onClick={() => {
                  setSelected({});
                  move.reset();
                  void list.refetch();
                }}
              >
                選択を解除
              </Button>
            </div>
            <FormApiError error={move.error} />
          </form>
        )}
      </section>
      {canManage && canUpdate && phase && !phase.archived_at && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setArchiveOpen(true)}
        >
          所属を移して無効化
        </Button>
      )}
      {archiveOpen && phase && (
        <PhaseArchiveDialog
          projectId={projectId}
          phase={phase}
          choices={choices}
          onClose={() => setArchiveOpen(false)}
          onArchived={onClose}
        />
      )}
    </aside>
  );
}

function PhaseDetailsForm({
  projectId,
  phase,
}: {
  projectId: number;
  phase: PhaseRead;
}) {
  const client = useQueryClient();
  const [baseline, setBaseline] = useState<PhaseRead>();
  const [draft, setDraft] = useState<{
    color: PhaseUpdateColor;
    description: string;
  }>();
  const save = useMutation({
    mutationFn: ({
      previous,
      values,
    }: {
      previous: PhaseRead;
      values: NonNullable<typeof draft>;
    }) =>
      updatePhaseProjectsProjectIdPhasesPhaseIdPatch(projectId, previous.id, {
        version: previous.version,
        color: values.color,
        description: values.description.trim() || null,
      }),
    onSuccess: async () => {
      await invalidateTaskProjectSurfaces(client, projectId);
      setBaseline(undefined);
      setDraft(undefined);
      toast.success("工程の詳細を保存しました。");
    },
  });
  const change = (change: Partial<NonNullable<typeof draft>>) => {
    setBaseline((value) => value ?? phase);
    setDraft({
      color: phase.color ?? null,
      description: phase.description ?? "",
      ...draft,
      ...change,
    });
  };
  const conflict = getConflictCurrent<PhaseRead>(save.error);
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (baseline && draft && !conflict && !save.isPending)
          save.mutate({ previous: baseline, values: draft });
      }}
    >
      <label className="grid gap-1 text-sm">
        識別色
        <select
          className={selectClass}
          value={draft ? (draft.color ?? "") : (phase.color ?? "")}
          onChange={(event) =>
            change({ color: (event.target.value || null) as PhaseUpdateColor })
          }
          disabled={save.isPending}
        >
          <option value="">指定なし</option>
          {Object.entries(phaseColors).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        工程の説明
        <Textarea
          value={draft?.description ?? phase.description ?? ""}
          maxLength={2000}
          onChange={(event) => change({ description: event.target.value })}
          disabled={save.isPending}
        />
      </label>
      {draft && (
        <Button
          type="submit"
          size="sm"
          disabled={save.isPending || Boolean(conflict)}
        >
          工程の詳細を保存
        </Button>
      )}
      {conflict && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setBaseline(conflict);
            setDraft({
              color: conflict.color ?? null,
              description: conflict.description ?? "",
            });
            save.reset();
          }}
        >
          最新の内容を読み込む
        </Button>
      )}
      <FormApiError error={save.error} />
    </form>
  );
}

function PhaseArchiveDialog({
  projectId,
  phase,
  choices,
  onClose,
  onArchived,
}: {
  projectId: number;
  phase: PhaseRead;
  choices: ReturnType<typeof destinations>;
  onClose: () => void;
  onArchived: () => void;
}) {
  const client = useQueryClient();
  const [destinationKey, setDestinationKey] = useState("");
  const preview =
    usePreviewPhaseArchiveProjectsProjectIdPhasesPhaseIdArchivePreviewGet(
      projectId,
      phase.id,
      { query: { retry: false, refetchOnMount: "always" } },
    );
  const destination = choices.find(
    ({ key }) => key === destinationKey,
  )?.assignment;
  const archive = useMutation({
    mutationFn: ({
      target,
      snapshot,
    }: {
      target: PhaseAssignment;
      snapshot: string;
    }) =>
      archivePhaseWithTransferProjectsProjectIdPhasesPhaseIdArchiveWithTransferPost(
        projectId,
        phase.id,
        { destination: target, snapshot },
      ),
    onSuccess: async ({ moved_count }) => {
      await invalidateTaskProjectSurfaces(client, projectId, {
        includeBoard: true,
      });
      toast.success(`「${phase.name}」を無効化しました。移動 ${moved_count}件`);
      onArchived();
    },
  });
  const stable = preview.isSuccess && !preview.isFetching;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !archive.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>工程「{phase.name}」を無効化</DialogTitle>
          <DialogDescription>
            {stable
              ? `移動対象 ${preview.data.task_count}件`
              : "所属タスクを確認しています。"}
          </DialogDescription>
        </DialogHeader>
        {preview.isError && (
          <DataLoadError
            resourceName="移動対象"
            isRetrying={preview.isFetching}
            onRetry={() => void preview.refetch()}
          />
        )}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!stable || archive.isPending || archive.isError) return;
            const target = preview.data.task_count
              ? destination
              : { kind: "unclassified" as const };
            if (target)
              archive.mutate({ target, snapshot: preview.data.snapshot });
          }}
        >
          {stable && preview.data.task_count > 0 && (
            <label className="grid gap-1 text-sm">
              タスクの移動先
              <select
                className={selectClass}
                value={destinationKey}
                onChange={(event) => setDestinationKey(event.target.value)}
                required
                disabled={archive.isPending}
              >
                <option value="">移動先を選択</option>
                {choices.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={archive.isPending}
              onClick={onClose}
            >
              キャンセル
            </Button>
            {archive.isError && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  archive.reset();
                  void preview.refetch();
                }}
              >
                移動対象を再確認
              </Button>
            )}
            <Button
              type="submit"
              variant="destructive"
              disabled={
                !stable ||
                (Boolean(preview.data?.task_count) && !destination) ||
                archive.isPending ||
                archive.isError
              }
            >
              無効化する
            </Button>
          </div>
          <FormApiError error={archive.error} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
