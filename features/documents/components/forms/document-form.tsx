"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MarkdownTextarea } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import {
  createDocumentProjectsProjectIdDocumentsPost as createDocument,
  updateDocumentProjectsProjectIdDocumentsDocumentIdPatch as updateDocument,
} from "@/lib/api/generated/documents/documents";
import type { DocumentRead } from "@/lib/api/generated/model/documentRead";
import { getConflictCurrent, getConflictFields } from "@/lib/api/conflict";
import { createDraftScope } from "@/lib/draft/draft-key";
import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";
import {
  documentKeys,
  documentsHref,
  mergeDocumentValues,
  type DocumentValues,
} from "../../lib/document";

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required("タイトル"))
    .max(200, VALIDATION_MESSAGES.maxLength("タイトル", 200)),
  body: z.string().max(100000, VALIDATION_MESSAGES.maxLength("本文", 100000)),
});

export function DocumentForm({
  projectId,
  document,
}: {
  projectId: number;
  document?: DocumentRead;
}) {
  const titleId = useId();
  const bodyId = useId();
  const router = useRouter();
  const cache = useQueryClient();
  const { user } = useAuth();
  const [initial] = useState<DocumentValues>({
    title: document?.title ?? "",
    body: document?.body ?? "",
  });
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof DocumentValues, string>>
  >({});
  const [conflict, setConflict] = useState<DocumentRead | null>(null);
  const [saved, setSaved] = useState(false);
  const draft = useFormDraft({
    userId: saved ? null : user?.id,
    scope: createDraftScope(
      "documents",
      "documents",
      document ? "update" : "create",
      projectId,
      document?.id,
    ),
    values,
    initialValues: initial,
    onRestore: setValues,
  });
  const save = useMutation({
    mutationFn: async ({
      data,
      version,
    }: {
      data: DocumentValues;
      version?: number;
    }) => {
      const parsed = schema.parse(data);
      return document
        ? updateDocument(projectId, document.id, {
            ...parsed,
            version: version ?? document.version,
          })
        : createDocument(projectId, parsed);
    },
    onSuccess: async (saved) => {
      setSaved(true);
      draft.clearDraft();
      setConflict(null);
      cache.setQueryData(documentKeys.detail(projectId, saved.id), saved);
      await cache.invalidateQueries({ queryKey: documentKeys.all(projectId) });
      toast.success("ドキュメントを保存しました。");
      router.push(documentsHref(projectId, saved.id));
    },
    onError: (error) => setConflict(getConflictCurrent<DocumentRead>(error)),
  });
  const handleSubmit = (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({ title: fields.title?.[0], body: fields.body?.[0] });
      return;
    }
    setErrors({});
    save.mutate({ data: result.data });
  };
  const current = conflict
    ? { title: conflict.title, body: conflict.body }
    : null;
  return (
    <>
      <form onSubmit={handleSubmit} className="min-w-0 max-w-4xl">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor={titleId}>タイトル</FieldLabel>
            <Input
              id={titleId}
              value={values.title}
              maxLength={200}
              required
              disabled={save.isPending}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.body)}>
            <FieldLabel htmlFor={bodyId}>本文</FieldLabel>
            <MarkdownTextarea
              id={bodyId}
              disabled={save.isPending}
              value={values.body}
              placeholder="手順、決定事項、参考情報などを記載"
              onChange={(body) =>
                setValues((previous) => ({ ...previous, body }))
              }
            />
            <FieldDescription>
              本文は10万文字まで。保存するたびに版履歴が残ります。
            </FieldDescription>
            {errors.body ? <FieldError>{errors.body}</FieldError> : null}
          </Field>
          <FormApiError error={save.error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "保存中…" : "保存"}
            </Button>
            <Button asChild variant="outline">
              <Link href={documentsHref(projectId, document?.id)}>
                キャンセル
              </Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onRestore={draft.restoreDraft}
        onDiscard={draft.discardDraft}
      />
      {conflict && current ? (
        <ConflictResolutionDialog
          key={conflict.version}
          open
          fields={getConflictFields({
            original: initial,
            local: values,
            current,
          })}
          localValues={mergeDocumentValues(initial, values, current)}
          currentValues={current}
          fieldLabels={{ title: "タイトル", body: "本文" }}
          isPending={save.isPending}
          onOpenChange={(open) => {
            if (!open) setConflict(null);
          }}
          onResolve={(data) =>
            save.mutateAsync({ data, version: conflict.version })
          }
        />
      ) : null}
    </>
  );
}
