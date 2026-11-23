"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/feedback/loading-state";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { canCreateTask } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useRequirement } from "@/features/requirements/hooks/use-requirement";
import { readStoredDraft } from "@/lib/draft/draft-storage";
import { withListReturn } from "@/lib/navigation/list-return";

import { useCreateTask } from "../../hooks/use-create-task";
import { useCreateRequirementTask } from "../../hooks/use-create-requirement-task";
import { useTask } from "../../hooks/use-task";
import {
  getTaskCreateDraftScope,
  readTaskCreateContext,
  readTaskCreateReturn,
} from "../../lib/task-create-route";
import {
  mergeTaskFormDraft,
  type TaskFormDraft,
} from "../../lib/task-form-draft";
import {
  defaultTaskFormValues,
  getChildTaskInitialValues,
} from "../../lib/task-mappers";
import { TaskForm } from "../forms/task-form";

export function TaskCreatePage({ projectId }: { projectId: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);
  const allowed = canCreateTask(currentProjectRole);
  const context = readTaskCreateContext(params);
  const listHref = `/projects/joined/${projectId}/tasks`;
  const returnTo =
    readTaskCreateReturn(projectId, params.get("returnTo")) ?? listHref;
  const parentQuery = useTask(allowed ? context.parentId : null);
  const requirementQuery = useRequirement(
    projectId,
    context.requirementId ?? 0,
    {
      enabled:
        allowed && context.requirementOrigin && Boolean(context.requirementId),
    },
  );
  const create = useCreateTask(projectId);
  const createForRequirement = useCreateRequirementTask(
    projectId,
    context.requirementId ?? 0,
  );
  const parent =
    parentQuery.task?.project_id === projectId ? parentQuery.task : null;
  const requirement = requirementQuery.requirement;
  const mutation = context.requirementOrigin ? createForRequirement : create;
  const initialValues = {
    ...(parent ? getChildTaskInitialValues(parent) : defaultTaskFormValues),
    ...(context.requirementId
      ? { requirementId: String(context.requirementId) }
      : {}),
    ...(context.phaseAssignment
      ? { phaseAssignment: context.phaseAssignment }
      : {}),
  };
  const draftScope = context.draftId
    ? getTaskCreateDraftScope(projectId, context.draftId)
    : `task:${projectId}:create-page:${initialValues.parentTaskId}:${initialValues.requirementId}:${initialValues.phaseAssignment}`;
  let startupValues;
  if (context.draftId) {
    const draft = readStoredDraft<TaskFormDraft>(user?.id, draftScope);
    if (draft) startupValues = mergeTaskFormDraft(draft.values, initialValues);
  }
  const loading =
    isLoading || parentQuery.isLoading || requirementQuery.isLoading;
  const missingContext =
    (context.parentId && !parent) ||
    (context.requirementOrigin && !requirement);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={returnTo}>
          <ArrowLeftIcon aria-hidden />
          起票元へ戻る
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">タスクを作成</h1>
      {loading ? (
        <LoadingState message="起票に必要な情報を読み込んでいます。" />
      ) : !allowed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          このプロジェクトでタスクを作成する権限がありません。
        </p>
      ) : missingContext ? (
        <p role="alert" className="text-sm text-destructive">
          起票元のタスクまたは要件を取得できませんでした。
        </p>
      ) : (
        <>
          <TaskForm
            key={draftScope}
            mode="create"
            fullWidth
            detailedCreate
            draftScope={draftScope}
            startupValues={startupValues}
            fixedRequirementLabel={
              context.requirementOrigin && requirement
                ? `${requirement.requirement_code} ${requirement.title}`
                : undefined
            }
            projectId={projectId}
            initialValues={initialValues}
            isPending={mutation.isPending}
            error={mutation.error}
            onCancel={() => router.push(returnTo)}
            onSubmit={async (values, saved) => {
              const task = context.requirementOrigin
                ? await createForRequirement.createRequirementTask(values)
                : await create.createTask(values, {
                    navigateAfterCreate: false,
                  });
              saved?.();
              const target = withListReturn(
                `${listHref}/${task.id}`,
                returnTo.startsWith(listHref + "?") ? returnTo : listHref,
              );
              router.push(
                `${target}&createReturn=${encodeURIComponent(returnTo)}`,
              );
            }}
          />
        </>
      )}
    </main>
  );
}
