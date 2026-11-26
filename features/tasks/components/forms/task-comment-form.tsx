"use client";

import { useId, useState } from "react";

import {
  CommentComposeTools,
  useCommentComposeMedia,
} from "@/components/shared/comments/comment-compose-media";
import { MentionTextarea } from "@/components/shared/comments/mention-textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import {
  CommentComposer,
  CommentSubmit,
} from "@/components/shared/comments/comment-composer";
import {
  Field,
  FieldError,
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

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { taskCommentSchema } from "../../schemas/task-schema";
import type {
  TaskCommentFormErrors,
  TaskCommentFormValues,
} from "../../types/task-comment-form";

type TaskCommentFormProps = {
  projectId: number;
  initialValues?: TaskCommentFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  enableStatusChange?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: TaskCommentFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export const TASK_COMMENT_STATUS_UNCHANGED = "__unchanged";

const defaultValues: TaskCommentFormValues = {
  body: "",
  mentions: [],
  status: TASK_COMMENT_STATUS_UNCHANGED,
};

export function TaskCommentForm({
  projectId,
  initialValues,
  submitLabel = "コメントを投稿",
  resetOnSuccess = true,
  enableStatusChange = false,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: TaskCommentFormProps) {
  const statusId = useId();
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const bodyId = useId();
  const media = useCommentComposeMedia(
    projectId,
    resetOnSuccess ? "task" : undefined,
  );
  const [errors, setErrors] = useState<TaskCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    if (isPending || !values.body.trim()) return;

    const result = taskCommentSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        body: fieldErrors.body?.[0],
      });
      return;
    }

    setErrors({});
    await media
      .send(async (imageIds) => {
        await onSubmit({ ...result.data, imageIds });
      })
      .then((saved) => {
        if (!saved) return;
        if (resetOnSuccess) {
          setValues(defaultValues);
        }
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  return (
    <form onSubmit={handleSubmit} {...media.formEvents}>
      <CommentComposer>
        <FieldGroup className="gap-2">
          <Field data-invalid={errors.body ? true : undefined}>
            <FieldLabel htmlFor={bodyId} className="sr-only">
              コメント本文
            </FieldLabel>
            <MentionTextarea
              id={bodyId}
              rows={2}
              disabled={isPending || media.sending}
              placeholder="コメントを入力…"
              className="min-h-12 max-h-32 resize-none overflow-y-auto"
              projectId={projectId}
              permission="task:read"
              mentions={values.mentions}
              value={values.body}
              onChange={(body, mentions) => {
                setValues((current) => ({
                  ...current,
                  body,
                  mentions,
                }));
                setErrors((current) => ({ ...current, body: undefined }));
              }}
              aria-invalid={Boolean(errors.body)}
            />
            {errors.body ? <FieldError>{errors.body}</FieldError> : null}
          </Field>

          {enableStatusChange ? (
            <Field>
              <FieldLabel htmlFor={statusId}>ステータスも変更</FieldLabel>
              <Select
                value={values.status}
                onValueChange={(status) =>
                  setValues((current) => ({ ...current, status }))
                }
              >
                <SelectTrigger id={statusId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={TASK_COMMENT_STATUS_UNCHANGED}>
                      変更しない
                    </SelectItem>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <FormApiError error={error} />
          <CommentComposeTools
            media={media}
            onInsertLink={(url) =>
              setValues((current) => ({
                ...current,
                body: current.body + (current.body.trim() ? "\n" : "") + url,
              }))
            }
            onMention={() => {
              setValues((current) => ({
                ...current,
                body: current.body + (current.body ? " @" : "@"),
              }));
              requestAnimationFrame(() => {
                const input = document.getElementById(
                  bodyId,
                ) as HTMLTextAreaElement | null;
                input?.focus();
                if (input) {
                  input.setSelectionRange(
                    input.value.length,
                    input.value.length,
                  );
                  input.click();
                }
              });
            }}
          >
            <CommentSubmit
              pending={isPending || media.sending}
              body={values.body}
            >
              {submitLabel}
            </CommentSubmit>
          </CommentComposeTools>
        </FieldGroup>
      </CommentComposer>
    </form>
  );
}
