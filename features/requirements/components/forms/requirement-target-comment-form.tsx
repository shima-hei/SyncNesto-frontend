"use client";

import { useId, useState } from "react";
import { useWorkbenchState } from "../../hooks/use-workbench-state";

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
import { Textarea } from "@/components/ui/textarea";

import { requirementTargetCommentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementTargetCommentFormErrors,
  RequirementTargetCommentFormValues,
} from "../../types/requirement-target-comment-form";

type RequirementTargetCommentFormProps = {
  projectId: number;
  initialValues?: RequirementTargetCommentFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  showReason?: boolean;
  showTargetAnchorInput?: boolean;
  targetAnchorLabel?: string;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementTargetCommentFormValues) => Promise<unknown>;
  onSuccess?: () => void;
  memoryKey?: string;
};

const defaultValues: RequirementTargetCommentFormValues = {
  body: "",
  mentions: [],
  targetAnchor: "",
  reason: "",
};

export function RequirementTargetCommentForm({
  projectId,
  initialValues,
  submitLabel = "コメントを投稿",
  resetOnSuccess = true,
  showReason = false,
  showTargetAnchorInput = true,
  targetAnchorLabel,
  isPending,
  error,
  onSubmit,
  onSuccess,
  memoryKey = "target-comment",
}: RequirementTargetCommentFormProps) {
  const [values, setValues] = useWorkbenchState(
    memoryKey,
    initialValues ?? defaultValues,
  );
  const bodyId = useId();
  const media = useCommentComposeMedia(
    projectId,
    !showReason ? "requirement" : undefined,
  );
  const [errors, setErrors] = useState<RequirementTargetCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    if (isPending || !values.body.trim()) return;

    const result = requirementTargetCommentSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        body: fieldErrors.body?.[0],
        targetAnchor: fieldErrors.targetAnchor?.[0],
        reason: fieldErrors.reason?.[0],
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
              permission="requirement:read"
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

          {!showReason && showTargetAnchorInput ? (
            <Field data-invalid={errors.targetAnchor ? true : undefined}>
              <FieldLabel>対象アンカー</FieldLabel>
              <Textarea
                value={values.targetAnchor}
                rows={2}
                onChange={(event) => {
                  const targetAnchor = event.currentTarget.value;
                  setValues((current) => ({
                    ...current,
                    targetAnchor,
                  }));
                  setErrors((current) => ({
                    ...current,
                    targetAnchor: undefined,
                  }));
                }}
                aria-invalid={Boolean(errors.targetAnchor)}
              />
              {errors.targetAnchor ? (
                <FieldError>{errors.targetAnchor}</FieldError>
              ) : null}
            </Field>
          ) : null}
          {!showReason && !showTargetAnchorInput && values.targetAnchor ? (
            <Field>
              <FieldLabel>選択箇所</FieldLabel>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {targetAnchorLabel ?? values.targetAnchor}
              </div>
            </Field>
          ) : null}

          {showReason ? (
            <Field>
              <FieldLabel>更新理由</FieldLabel>
              <Textarea
                value={values.reason}
                onChange={(event) => {
                  const reason = event.currentTarget.value;
                  setValues((current) => ({
                    ...current,
                    reason,
                  }));
                }}
              />
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
