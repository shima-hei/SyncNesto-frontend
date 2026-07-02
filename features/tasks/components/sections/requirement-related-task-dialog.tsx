"use client";

import { useMemo, useState } from "react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

import { TASK_RELATION_TYPE_OPTIONS } from "../../constants/task-options";
import { useCreateRequirementTask } from "../../hooks/use-create-requirement-task";
import { useCreateRequirementTaskRelation } from "../../hooks/use-create-requirement-task-relation";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { TaskForm } from "../forms/task-form";
import { TaskParentSelectField } from "../forms/task-parent-select-field";

type RequirementRelatedTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  requirementId: number;
  linkedTaskIds: number[];
};

export function RequirementRelatedTaskDialog({
  open,
  onOpenChange,
  projectId,
  requirementId,
  linkedTaskIds,
}: RequirementRelatedTaskDialogProps) {
  const [createFormKey, setCreateFormKey] = useState(0);
  const {
    createRequirementTask,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementTask(projectId, requirementId);
  const initialValues = useMemo(() => {
    return {
      ...defaultTaskFormValues,
      requirementId: String(requirementId),
    };
  }, [requirementId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,960px)] overflow-y-auto p-6 sm:max-w-none">
        <DialogHeader>
          <DialogTitle>関連タスク追加</DialogTitle>
          <DialogDescription>
            この要件を実装・確認するタスクを新規登録するか、既存タスクを関連付けます。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">新規タスク</TabsTrigger>
            <TabsTrigger value="existing">既存タスク</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="pt-2">
            <TaskForm
              key={createFormKey}
              mode="create"
              projectId={projectId}
              initialValues={initialValues}
              isPending={isCreatePending}
              error={createError}
              onSubmit={createRequirementTask}
              onSuccess={() => {
                setCreateFormKey((current) => current + 1);
                onOpenChange(false);
              }}
            />
          </TabsContent>
          <TabsContent value="existing" className="pt-2">
            <RequirementTaskRelationForm
              projectId={projectId}
              requirementId={requirementId}
              linkedTaskIds={linkedTaskIds}
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RequirementTaskRelationForm({
  projectId,
  requirementId,
  linkedTaskIds,
  onSuccess,
}: {
  projectId: number;
  requirementId: number;
  linkedTaskIds: number[];
  onSuccess: () => void;
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
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    if (!/^\d+$/.test(taskId.trim())) {
      setError(VALIDATION_MESSAGES.required("既存タスク"));
      return;
    }

    setError(null);
    await createRequirementTaskRelation(Number(taskId), relationType)
      .then(() => {
        setTaskId("");
        onSuccess();
      })
      .catch(() => undefined);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <TaskParentSelectField
            projectId={projectId}
            label="既存タスク"
            placeholder="関連付けるタスクを選択"
            value={taskId}
            error={error ?? undefined}
            excludedTaskIds={linkedTaskIds}
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
          <Button type="submit" className="shrink-0" disabled={isPending}>
            関連付け
          </Button>
        </div>
        <FormApiError error={apiError} />
      </FieldGroup>
    </form>
  );
}
