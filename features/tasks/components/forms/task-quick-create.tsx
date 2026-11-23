"use client";

import {
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useCurrentRoute } from "@/hooks/use-current-route";
import { writeStoredDraft } from "@/lib/draft/draft-storage";
import {
  getTaskCreateDraftScope,
  getTaskCreateHref,
} from "../../lib/task-create-route";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import { getTaskFormDraftScope } from "../../lib/task-form-draft";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaskRead } from "@/lib/api/generated/model";

import type { TaskFormValues } from "../../types/task-form";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { getTaskEstimateHref } from "../../lib/planning-route";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_RELATION_TYPE_OPTIONS,
} from "../../constants/task-options";
import { DateField, TaskSelectField } from "./task-form-fields";
import { TaskUserSelectField } from "./task-user-select-field";
import { useListNavigation } from "@/hooks/use-list-navigation";

export type TaskQuickCreateHandle = { openDetailed: () => void };

export function TaskQuickCreate({
  projectId,
  initialValues = defaultTaskFormValues,
  submitTask,
  isPending,
  error,
  focusOnOpen = false,
  titleId,
  label = "新しいタスク",
  gantt = false,
  visibleIds,
  onCreated,
  actions,
  onClose,
  requirementOrigin = false,
  guardNavigation,
  detailsRef,
}: {
  projectId: number;
  initialValues?: TaskFormValues;
  submitTask: (values: TaskFormValues) => Promise<TaskRead>;
  isPending: boolean;
  error?: Error | null;
  focusOnOpen?: boolean;
  titleId?: string;
  label?: string;
  gantt?: boolean;
  visibleIds?: number[];
  onCreated?: (task: TaskRead) => void;
  actions?: (task: TaskRead) => ReactNode;
  onClose?: () => void;
  requirementOrigin?: boolean;
  detailsRef?: Ref<TaskQuickCreateHandle>;
  guardNavigation?: (action: () => void) => void;
}) {
  const id = useId();
  const optionsId = useId();
  const router = useRouter();
  const currentRoute = useCurrentRoute();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const defaults = {
    title: "",
    description: "",
    assigneeId: initialValues.assigneeId,
    dueDate: initialValues.dueDate,
    priority: initialValues.priority,
    relationType: initialValues.relationType,
  };
  const [values, setValues] = useState(defaults);
  const { user } = useAuth();
  const draftScope =
    getTaskFormDraftScope(projectId, "create", initialValues) +
    (gantt ? ":gantt:" + initialValues.phaseAssignment : ":quick");
  const [storageError, setStorageError] = useState(false);
  const draft = useFormDraft({
    userId: storageError ? null : user?.id,
    scope: draftScope,
    initialValues: defaults,
    values,
    onRestore: setValues,
  });
  const [transferError, setTransferError] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [created, setCreated] = useState<TaskRead | null>(null);
  const { withReturn } = useListNavigation(
    "/projects/joined/" + projectId + "/tasks",
  );
  useEffect(() => {
    if (focusOnOpen) input.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);
  const change = (field: keyof typeof defaults, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    try {
      if (JSON.stringify(next) === JSON.stringify(defaults)) draft.clearDraft();
      else writeStoredDraft(user?.id, draftScope, next);
    } catch {
      setStorageError(true);
    }
  };
  const submit = async () => {
    if (inFlight.current || !values.title.trim()) return;
    inFlight.current = true;
    try {
      const task = await submitTask({ ...initialValues, ...values });
      setValues(defaults);
      setCreated(task);
      try {
        draft.clearDraft();
      } catch {
        setStorageError(true);
      }
      onCreated?.(task);
      input.current?.focus({ preventScroll: true });
    } catch {
      // 失敗時は入力を保持する。
    } finally {
      inFlight.current = false;
    }
  };
  const openDetailed = () => {
    const navigate = () => {
      try {
        const draftId = crypto.randomUUID();
        if (!user) throw new Error();
        writeStoredDraft(user.id, getTaskCreateDraftScope(projectId, draftId), {
          initialValues,
          values: { ...initialValues, ...values },
        });
        const href = getTaskCreateHref(projectId, initialValues, currentRoute, {
          draftId,
          requirementOrigin,
        });
        draft.clearDraft();
        setValues(defaults);
        router.push(href);
      } catch {
        setTransferError(true);
      }
    };
    if (guardNavigation) guardNavigation(navigate);
    else navigate();
  };
  useImperativeHandle(detailsRef, () => ({ openDetailed }));
  return (
    <div className="space-y-2 bg-muted/35 px-2 py-2">
      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft) && (!gantt || focusOnOpen)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onDiscard={draft.discardDraft}
        onRestore={draft.restoreDraft}
      />
      <form
        aria-labelledby={id + "-label"}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Field className="min-w-0 flex-1 basis-40 gap-1">
            <FieldLabel
              className="sr-only"
              id={id + "-label"}
              htmlFor={titleId ?? id}
            >
              {label}
            </FieldLabel>
            <Input
              id={titleId ?? id}
              name="title"
              maxLength={255}
              ref={input}
              value={values.title}
              placeholder={
                gantt ? "タスク名を入力" : "タスク名を入力（Enterで登録）"
              }
              required
              autoComplete="off"
              enterKeyHint="done"
              readOnly={isPending}
              onChange={(e) => change("title", e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)
                )
                  e.preventDefault();
              }}
            />
          </Field>
          <Button
            size="sm"
            type="submit"
            disabled={isPending || !values.title.trim()}
          >
            {isPending ? "登録中…" : "登録"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            aria-expanded={optionsOpen}
            aria-controls={optionsId}
            onClick={() => setOptionsOpen(!optionsOpen)}
          >
            {gantt ? "メモ" : "追加項目"}
            <ChevronDownIcon aria-hidden />
          </Button>
          {!detailsRef && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={isPending}
              onClick={openDetailed}
            >
              詳細起票
            </Button>
          )}
          {onClose && (
            <Button
              size="icon-sm"
              variant="ghost"
              type="button"
              aria-label="クイック起票を閉じる"
              disabled={isPending}
              onClick={onClose}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <div id={optionsId} hidden={!optionsOpen}>
          {optionsOpen && (
            <fieldset
              disabled={isPending}
              className="mt-3 grid min-w-0 gap-3 sm:grid-cols-3"
            >
              <legend className="sr-only">任意の項目</legend>
              {!gantt && (
                <>
                  <TaskUserSelectField
                    projectId={projectId}
                    label="担当者"
                    value={values.assigneeId}
                    onChange={(v) => change("assigneeId", v)}
                  />
                  <DateField
                    label="終了予定日"
                    value={values.dueDate}
                    onChange={(v) => change("dueDate", v)}
                  />
                  <TaskSelectField
                    label="優先度"
                    options={TASK_PRIORITY_OPTIONS}
                    value={values.priority}
                    onChange={(v) => change("priority", v)}
                  />
                  {initialValues.requirementId && (
                    <TaskSelectField
                      label="関連種別"
                      options={TASK_RELATION_TYPE_OPTIONS}
                      value={values.relationType}
                      onChange={(v) => change("relationType", v)}
                    />
                  )}
                </>
              )}
              <Field className="sm:col-span-3">
                <FieldLabel htmlFor={id + "-memo"}>メモ</FieldLabel>
                <Textarea
                  id={id + "-memo"}
                  name="description"
                  rows={2}
                  value={values.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </Field>
            </fieldset>
          )}
        </div>
        {transferError && (
          <p role="alert" className="text-sm text-destructive">
            入力を引き継げませんでした。入力を保持しています。
          </p>
        )}
        {storageError && (
          <p role="alert" className="text-sm text-destructive">
            このブラウザーに下書きを保存できませんでした。
          </p>
        )}
        <FormApiError error={error} />
      </form>
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm empty:sr-only"
      >
        {created && (
          <>
            <span>
              {created.task_code}「{created.title}」を登録しました。
              {visibleIds &&
                !visibleIds.includes(created.id) &&
                "現在の表示条件・ページには表示されません。"}
            </span>
            <Link
              className="underline"
              href={`${withReturn(`/projects/joined/${projectId}/tasks/${created.id}`)}&createReturn=${encodeURIComponent(currentRoute)}`}
            >
              詳細を開く
            </Link>
            <Link
              className="underline"
              href={getTaskEstimateHref(projectId, created.id)}
            >
              見積を入力
            </Link>
            {actions?.(created)}
          </>
        )}
      </div>
    </div>
  );
}
