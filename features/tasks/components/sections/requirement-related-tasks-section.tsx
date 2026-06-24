"use client";

import { useMemo, useState } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format/date";
import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

import { TASK_RELATION_TYPE_OPTIONS } from "../../constants/task-options";
import { useCreateRequirementTask } from "../../hooks/use-create-requirement-task";
import { useCreateRequirementTaskRelation } from "../../hooks/use-create-requirement-task-relation";
import { useDeleteRequirementTaskRelation } from "../../hooks/use-delete-requirement-task-relation";
import { useRequirementTasks } from "../../hooks/use-requirement-tasks";
import { useTaskProgress } from "../../hooks/use-task-progress";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { TaskForm } from "../forms/task-form";
import { TaskParentSelectField } from "../forms/task-parent-select-field";
import { TaskStatusBadge, TaskTypeBadge } from "../shared/task-badges";
import { TaskDetailLink } from "../tables/tasks-table";

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
  const [createFormKey, setCreateFormKey] = useState(0);
  const [deleteRelationId, setDeleteRelationId] = useState<number | null>(null);
  const { tasks, isLoading } = useRequirementTasks(requirementId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { progress } = useTaskProgress(requirementId);
  const {
    createRequirementTask,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementTask(projectId, requirementId);
  const { deleteRequirementTaskRelation, isPending: isDeleteRelationPending } =
    useDeleteRequirementTaskRelation(requirementId);
  const initialValues = useMemo(() => {
    return {
      ...defaultTaskFormValues,
      requirementId: String(requirementId),
    };
  }, [requirementId]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">関連タスク</h3>
          {progress ? (
            <p className="text-sm text-muted-foreground">
              {progress.task_count}件 / 進捗 {progress.progress_percent}%
            </p>
          ) : null}
        </div>
        {canCreate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen((current) => !current)}
          >
            {isCreateOpen ? (
              <XIcon data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {isCreateOpen ? "閉じる" : "関連タスク追加"}
          </Button>
        ) : null}
      </div>
      {canCreate && isCreateOpen ? (
        <Card>
          <CardContent className="pt-4">
            <TaskForm
              key={createFormKey}
              mode="create"
              projectId={projectId}
              initialValues={initialValues}
              isPending={isCreatePending}
              error={createError}
              onSubmit={async (values) => {
                await createRequirementTask(values);
                setCreateFormKey((current) => current + 1);
                setIsCreateOpen(false);
              }}
            />
          </CardContent>
        </Card>
      ) : null}
      {canCreate ? (
        <RequirementTaskRelationForm
          projectId={projectId}
          requirementId={requirementId}
        />
      ) : null}
      {isLoading ? (
        <TableListSkeleton widths={["w-56", "w-24", "w-20", "w-24"]} />
      ) : (
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
                  (requirement) => requirement.id === requirementId
                );

                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex min-w-52 flex-col">
                        <span className="truncate font-medium">{task.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {task.task_code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TaskTypeBadge type={task.task_type} />
                    </TableCell>
                    <TableCell>{getTaskUserLabel(task.assignee_id)}</TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      {formatDate(task.start_date)} - {formatDate(task.due_date)}
                    </TableCell>
                    <TableCell>{task.progress_percent ?? 0}%</TableCell>
                    <TableCell>{relation?.relation_type ?? "-"}</TableCell>
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
              <TableEmptyRow colSpan={8} message="関連タスクはありません。" />
            )}
          </TableBody>
        </Table>
      )}
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
    </section>
  );
}

function RequirementTaskRelationForm({
  projectId,
  requirementId,
}: {
  projectId: number;
  requirementId: number;
}) {
  const [taskId, setTaskId] = useState("");
  const [relationType, setRelationType] = useState("implements");
  const [error, setError] = useState<string | null>(null);
  const {
    createRequirementTaskRelation,
    isPending,
    error: apiError,
  } = useCreateRequirementTaskRelation(requirementId);

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    if (!/^\d+$/.test(taskId.trim())) {
      setError(VALIDATION_MESSAGES.required("既存タスク"));
      return;
    }

    setError(null);
    await createRequirementTaskRelation(Number(taskId), relationType)
      .then(() => setTaskId(""))
      .catch(() => undefined);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
              <TaskParentSelectField
                projectId={projectId}
                label="既存タスク"
                placeholder="関連付けるタスクを選択"
                value={taskId}
                error={error ?? undefined}
                onChange={(value) => {
                  setTaskId(value);
                  setError(null);
                }}
              />
              <Field>
                <FieldLabel>関連種別</FieldLabel>
                <Select value={relationType} onValueChange={setRelationType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TASK_RELATION_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" disabled={isPending}>
                関連付け
              </Button>
            </div>
            <FormApiError error={apiError} />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
