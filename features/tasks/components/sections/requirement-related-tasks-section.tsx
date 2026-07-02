"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format/date";

import { getTaskRelationTypeLabel } from "../../constants/task-options";
import { useDeleteRequirementTaskRelation } from "../../hooks/use-delete-requirement-task-relation";
import { useRequirementTasks } from "../../hooks/use-requirement-tasks";
import { useTaskProgress } from "../../hooks/use-task-progress";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { TaskStatusBadge, TaskTypeBadge } from "../shared/task-badges";
import { TaskDetailLink } from "../tables/tasks-table";
import { RequirementRelatedTaskDialog } from "./requirement-related-task-dialog";

type RequirementRelatedTasksSectionProps = {
  projectId: number;
  requirementId: number;
  canCreate: boolean;
};

export function RequirementRelatedTasksSection({
  projectId,
  requirementId,
  canCreate,
}: RequirementRelatedTasksSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteRelationId, setDeleteRelationId] = useState<number | null>(null);
  const { tasks, isLoading } = useRequirementTasks(requirementId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { progress } = useTaskProgress(requirementId);
  const linkedTaskIds = tasks.map((task) => task.id);
  const { deleteRequirementTaskRelation, isPending: isDeleteRelationPending } =
    useDeleteRequirementTaskRelation(requirementId);

  return (
    <Card>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">
            関連タスク
            {progress ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {progress.task_count}件 / 進捗 {progress.progress_percent}%
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            この要件を実装、確認、調査するタスクの進捗を確認します。
          </CardDescription>
          {progress ? (
            <p className="text-xs text-muted-foreground">
              関連タスクが{progress.task_count}件あります。
            </p>
          ) : null}
        </div>
        {canCreate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            関連タスク追加
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <TableListSkeleton widths={["w-56", "w-24", "w-20", "w-24"]} />
        ) : (
          <div className="max-h-[24rem] overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タスク</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>期間</TableHead>
                  <TableHead>進捗</TableHead>
                  <TableHead>関連種別</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length ? (
                  tasks.map((task) => {
                    const relation = task.requirements?.find(
                      (requirement) => requirement.id === requirementId,
                    );

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex min-w-52 flex-col">
                            <span className="truncate font-medium">
                              {task.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {task.task_code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TaskTypeBadge type={task.task_type} />
                        </TableCell>
                        <TableCell>
                          {getTaskUserLabel(task.assignee_id)}
                        </TableCell>
                        <TableCell>
                          <TaskStatusBadge status={task.status} />
                        </TableCell>
                        <TableCell>
                          {formatDate(task.start_date)} -{" "}
                          {formatDate(task.due_date)}
                        </TableCell>
                        <TableCell>{task.progress_percent ?? 0}%</TableCell>
                        <TableCell>
                          {getTaskRelationTypeLabel(relation?.relation_type)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <TaskDetailLink projectId={projectId} task={task} />
                            {canCreate && relation ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDeleteRelationId(relation.relation_id)
                                }
                              >
                                <Trash2Icon data-icon="inline-start" />
                                解除
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableEmptyRow
                    colSpan={8}
                    message="関連タスクはありません。"
                  />
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {canCreate ? (
        <RequirementRelatedTaskDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          projectId={projectId}
          requirementId={requirementId}
          linkedTaskIds={linkedTaskIds}
        />
      ) : null}
      <ResourceDeleteDialog
        open={Boolean(deleteRelationId)}
        onOpenChange={(open) => !open && setDeleteRelationId(null)}
        resourceName="関連タスク"
        description="この要件とタスクの紐づけを解除します。タスク自体は削除されません。"
        isPending={isDeleteRelationPending}
        onConfirm={async () => {
          if (!deleteRelationId) {
            return;
          }

          await deleteRequirementTaskRelation(deleteRelationId);
          setDeleteRelationId(null);
        }}
      />
    </Card>
  );
}
