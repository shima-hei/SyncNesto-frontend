"use client";

import { useState } from "react";
import Link from "next/link";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import { MessageSquarePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { RelatedItemsGroup } from "@/components/shared/detail/related-items-group";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Button } from "@/components/ui/button";

import { formatDate } from "@/lib/format/date";
import {
  createRequirementTaskCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "@/features/requirements/lib/requirement-comment-anchor";

import { getTaskRelationTypeLabel } from "../../constants/task-options";
import { useDeleteRequirementTaskRelation } from "../../hooks/use-delete-requirement-task-relation";
import { useRequirementTasks } from "../../hooks/use-requirement-tasks";
import { useTaskProgress } from "../../hooks/use-task-progress";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { TaskStatusBadge, TaskTypeBadge } from "../shared/task-badges";
import { RequirementRelatedTaskPanel } from "./requirement-related-task-panel";

type RequirementRelatedTasksSectionProps = {
  projectId: number;
  requirementId: number;
  canCreate: boolean;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
};

export function RequirementRelatedTasksSection({
  projectId,
  requirementId,
  canCreate,
  onSelectCommentAnchor,
}: RequirementRelatedTasksSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteRelationId, setDeleteRelationId] = useState<number | null>(null);
  const { tasks, isLoading, error } = useRequirementTasks(requirementId);
  const { withOrigin } = useTaskOrigin(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { progress } = useTaskProgress(requirementId);
  const linkedTaskIds = tasks.map((task) => task.id);
  const { deleteRequirementTaskRelation, isPending: isDeleteRelationPending } =
    useDeleteRequirementTaskRelation(requirementId);

  return (
    <RelatedItemsGroup
      title="タスク"
      count={
        isLoading || error ? undefined : (progress?.task_count ?? tasks.length)
      }
      summary={
        progress?.task_count ? `進捗 ${progress.progress_percent}%` : undefined
      }
      action={
        canCreate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={isCreateOpen}
            onClick={() => setIsCreateOpen(!isCreateOpen)}
          >
            <PlusIcon data-icon="inline-start" />
            {isCreateOpen ? "入力欄を閉じる" : "タスクを関連付け"}
          </Button>
        ) : null
      }
    >
      {canCreate ? (
        <RequirementRelatedTaskPanel
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          projectId={projectId}
          requirementId={requirementId}
          linkedTaskIds={linkedTaskIds}
        />
      ) : null}

      {isLoading ? (
        <TableListSkeleton widths={["w-56", "w-24", "w-20", "w-24"]} />
      ) : error ? (
        <p role="alert" className="text-sm text-muted-foreground">
          関連タスクを読み込めませんでした。
        </p>
      ) : tasks.length ? (
        <ul className="divide-y">
          {tasks.map((task) => {
            const relation = task.requirements?.find(
              (requirement) => requirement.id === requirementId,
            );
            const commentAnchor = createRequirementTaskCommentAnchor({
              id: task.id,
              task_code: task.task_code,
              title: task.title,
              relation_id: relation?.relation_id,
            });
            return (
              <li
                key={task.id}
                className="group scroll-mt-24 py-2.5"
                data-requirement-comment-anchor={getRequirementCommentAnchorKey(
                  commentAnchor,
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <Link
                    className="min-w-0 break-words text-sm font-medium underline-offset-4 hover:underline"
                    href={withOrigin(
                      `/projects/joined/${projectId}/tasks/${task.id}`,
                    )}
                  >
                    <span className="mr-2 text-xs text-muted-foreground">
                      {task.task_code}
                    </span>
                    {task.title}
                  </Link>
                  <TaskStatusBadge status={task.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <TaskTypeBadge
                      type={task.task_type}
                      name={task.task_type_name}
                    />
                    <span>{getTaskUserLabel(task.assignee_id)}</span>
                    {task.start_date || task.due_date ? (
                      <span>
                        {formatDate(task.start_date)} –{" "}
                        {formatDate(task.due_date)}
                      </span>
                    ) : null}
                    <span>進捗 {task.progress_percent ?? 0}%</span>
                    <span>
                      {getTaskRelationTypeLabel(relation?.relation_type)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {onSelectCommentAnchor ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
                        onClick={() => onSelectCommentAnchor(commentAnchor)}
                      >
                        <MessageSquarePlusIcon data-icon="inline-start" />
                        コメント
                      </Button>
                    ) : null}
                    {canCreate && relation ? (
                      <Button
                        type="button"
                        variant="ghost"
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
                </div>
              </li>
            );
          })}
        </ul>
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
    </RelatedItemsGroup>
  );
}
