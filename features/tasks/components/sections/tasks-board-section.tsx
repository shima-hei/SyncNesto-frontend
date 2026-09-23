"use client";

import { useMemo, useState } from "react";

import type { TaskRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useProjectBoards } from "../../hooks/use-project-boards";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import {
  type BoardSwimlane,
  getBoardStatusClassName,
  getNextTaskBoardSortOrder,
  getTaskBoardSwimlanes,
} from "../../lib/task-board";
import { TaskBoardCard } from "../board/task-board-card";
import { TaskDetailSheet } from "./task-detail-sheet";
export type { BoardSwimlane } from "../../lib/task-board";

type TasksBoardSectionProps = {
  projectId: number;
  tasks: TaskRead[];
  canUpdate: boolean;
  swimlane: BoardSwimlane;
  isCompletedCollapsed: boolean;
};

export function TasksBoardSection({
  projectId,
  tasks,
  canUpdate,
  swimlane,
  isCompletedCollapsed,
}: TasksBoardSectionProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const { updateTaskStatus, isPending } = useUpdateTaskStatus(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { defaultBoard } = useProjectBoards(projectId);
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const visibleStatuses = TASK_STATUS_OPTIONS.filter(
    (status) =>
      !isCompletedCollapsed ||
      (status.value !== "done" && status.value !== "cancelled"),
  );
  const swimlanes = useMemo(() => {
    return getTaskBoardSwimlanes(tasks, swimlane, getTaskUserLabel, tasksById);
  }, [getTaskUserLabel, swimlane, tasks, tasksById]);

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    status: string,
  ) => {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    const task = tasksById.get(
      Number(event.dataTransfer.getData("text/plain")),
    );

    if (!task || task.status === status) {
      return;
    }

    updateTaskStatus(task, status, {
      boardId: defaultBoard?.id,
      sortOrder: getNextTaskBoardSortOrder(tasks, status),
    }).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-5">
        {swimlanes.map((lane) => (
          <section key={lane.key} className="flex flex-col gap-2">
            {swimlane !== "none" ? (
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate text-sm font-semibold">{lane.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {lane.tasks.length}件
                </span>
              </div>
            ) : null}
            <div className="overflow-x-auto pb-2">
              <div className="grid auto-cols-[minmax(280px,320px)] grid-flow-col gap-3">
                {visibleStatuses.map((status) => {
                  const columnTasks = lane.tasks.filter(
                    (task) => task.status === status.value,
                  );

                  return (
                    <div
                      key={`${lane.key}-${status.value}`}
                      className={cn(
                        "flex h-[clamp(30rem,calc(100vh-14rem),52rem)] min-w-0 flex-col overflow-hidden rounded-lg border",
                        getBoardStatusClassName(status.value),
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-current/20 px-3 py-2">
                        <h4 className="text-sm font-semibold">
                          {status.label}
                        </h4>
                        <span className="rounded-full border border-current/20 bg-background/70 px-2 py-0.5 text-xs font-medium">
                          {columnTasks.length}
                        </span>
                      </div>
                      <div
                        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
                        onDragOver={(event) => {
                          if (canUpdate) {
                            event.preventDefault();
                          }
                        }}
                        onDrop={(event) => handleDrop(event, status.value)}
                      >
                        {columnTasks.length ? (
                          columnTasks.map((task) => (
                            <TaskBoardCard
                              key={`${task.id}-${task.version}-${task.assignee_id ?? "none"}-${task.due_date ?? "none"}`}
                              projectId={projectId}
                              task={task}
                              canUpdate={canUpdate}
                              isPending={isPending}
                              assigneeLabel={getTaskUserLabel(task.assignee_id)}
                              onMove={(targetStatus) =>
                                updateTaskStatus(task, targetStatus, {
                                  boardId: defaultBoard?.id,
                                  sortOrder: getNextTaskBoardSortOrder(
                                    tasks,
                                    targetStatus,
                                  ),
                                })
                              }
                              onOpenDetail={setSelectedTaskId}
                            />
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed border-current/25 bg-background/60 p-3 text-xs text-muted-foreground">
                            タスクはありません。
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
      <TaskDetailSheet
        projectId={projectId}
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
      />
    </div>
  );
}
