"use client";

import { useId, useState } from "react";
import { useProjectObjectives } from "@/features/projects/hooks/use-project-objectives";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getConflictFields } from "@/lib/api/conflict";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";

import { REQUIREMENT_DOCUMENT_CONFLICT_FIELD_LABELS } from "../../constants/requirement-conflict-fields";
import { REQUIREMENT_DOCUMENT_STATUS_OPTIONS } from "../../constants/requirement-options";
import { requirementDocumentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementDocumentFormErrors,
  RequirementDocumentFormValues,
} from "../../types/requirement-document-form";
import {
  RequirementDocumentUserField,
  type RequirementDocumentUserValues,
} from "./requirement-document-user-field";

type RequirementDocumentFormProps = {
  projectId: number;
  mode: "create" | "update";
  initialValues: RequirementDocumentFormValues;
  draftScope?: string;
  draftResourceId?: number | null;
  initialUsers?: RequirementDocumentUserValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: RequirementDocumentFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (
    values: RequirementDocumentFormValues,
  ) => Promise<unknown>;
  onSubmit: (values: RequirementDocumentFormValues) => Promise<unknown>;
};

export function RequirementDocumentForm({
  projectId,
  mode,
  initialValues,
  draftScope,
  draftResourceId = null,
  initialUsers = {},
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: RequirementDocumentFormProps) {
  const objectives = useProjectObjectives(projectId);
  const objectivesEnabled = Boolean(
    objectives.data?.enabled && objectives.data.state !== "restricted",
  );
  const goalInputId = useId();
  const prepareValues = (input: RequirementDocumentFormValues) => {
    if (objectivesEnabled) return input;
    const copy = { ...input };
    delete copy.projectGoal;
    delete copy.projectScope;
    delete copy.projectCompletionCriteria;
    return copy;
  };
  const titleId = useId();
  const documentCodeId = useId();
  const purposeId = useId();
  const targetSystemNameId = useId();
  const clientNameId = useId();
  const vendorNameId = useId();
  const approvedAtId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementDocumentFormErrors>({});
  const { user } = useAuth();
  const draft = useFormDraft({
    userId: user?.id ?? null,
    scope: draftScope ?? "",
    values,
    initialValues,
    serverDraft: draftScope
      ? {
          enabled: true,
          resourceType: "requirement_document",
          resourceId: draftResourceId,
          projectId,
        }
      : undefined,
    onRestore: setValues,
  });
  const conflictFields = conflictValues
    ? getConflictFields({
        original: initialValues as unknown as Record<string, unknown>,
        local: values as unknown as Record<string, unknown>,
        current: conflictValues as unknown as Record<string, unknown>,
      })
    : [];

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const submittedValues =
      mode === "create" && !values.documentCode.trim()
        ? {
            ...values,
            documentCode: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          }
        : values;
    if (submittedValues !== values) setValues(submittedValues);
    const result = requirementDocumentSchema.safeParse(submittedValues);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        documentCode: fieldErrors.documentCode?.[0],
        status: fieldErrors.status?.[0],
        projectGoal: fieldErrors.projectGoal?.[0],
        projectScope: fieldErrors.projectScope?.[0],
        projectCompletionCriteria: fieldErrors.projectCompletionCriteria?.[0],
      });
      const goalError = (
        ["projectGoal", "projectScope", "projectCompletionCriteria"] as const
      ).find((key) => fieldErrors[key]?.length);
      requestAnimationFrame(() =>
        document
          .getElementById(
            fieldErrors.title
              ? titleId
              : goalError
                ? `${goalInputId}-${goalError}`
                : documentCodeId,
          )
          ?.focus(),
      );
      return;
    }

    setErrors({});
    await onSubmit(prepareValues(result.data))
      .then(() => draft.clearDraft())
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementDocumentFormValues>(
    field: TKey,
    value: RequirementDocumentFormValues[TKey],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <>
      <form
        className="@container/document-form min-w-0 max-w-3xl"
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor={titleId}>要件定義書の名前（必須）</FieldLabel>
            <Input
              id={titleId}
              name="title"
              placeholder="例: 会員サービスの要件定義…"
              value={values.title}
              onChange={(event) => updateValue("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={purposeId}>
              目的・チームで実現したいこと
            </FieldLabel>
            <Textarea
              id={purposeId}
              placeholder="誰の、どの困りごとを解決するかを書きます…"
              value={values.purpose}
              onChange={(event) => updateValue("purpose", event.target.value)}
            />
          </Field>

          {objectivesEnabled ? (
            <details
              className="border-t pt-3"
              open={
                errors.projectGoal ||
                errors.projectScope ||
                errors.projectCompletionCriteria
                  ? true
                  : undefined
              }
            >
              <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2">
                案件のゴール・範囲・完了条件（任意）
              </summary>
              <FieldGroup className="mt-4">
                <FieldDescription>
                  この文書に保存した内容を案件概要から参照できます。既存の文書の目的とは別に、必要な項目だけ追記します。
                </FieldDescription>
                {(
                  [
                    ["projectGoal", "ゴール・実現すること"],
                    ["projectScope", "対象範囲・対象外"],
                    ["projectCompletionCriteria", "案件の完了条件"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} data-invalid={Boolean(errors[key])}>
                    <FieldLabel htmlFor={`${goalInputId}-${key}`}>
                      {label}
                    </FieldLabel>
                    <Textarea
                      id={`${goalInputId}-${key}`}
                      name={key}
                      value={values[key] ?? ""}
                      maxLength={20000}
                      aria-invalid={Boolean(errors[key])}
                      onChange={(event) => updateValue(key, event.target.value)}
                    />
                    {errors[key] ? (
                      <FieldError>{errors[key]}</FieldError>
                    ) : null}
                  </Field>
                ))}
              </FieldGroup>
            </details>
          ) : null}

          <p className="text-sm text-muted-foreground">
            名前だけで始められます。保存後に要件を書き、まだ決まっていないことは未決事項として相談できます。
          </p>
          <details
            className="border-t pt-3"
            open={errors.documentCode || errors.status ? true : undefined}
          >
            <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2">
              分類・担当・承認情報（後から設定できます）
            </summary>
            <FieldGroup className="mt-4">
              <div className="grid gap-4 @min-[24rem]/document-form:grid-cols-2">
                <Field data-invalid={errors.documentCode ? true : undefined}>
                  <FieldLabel htmlFor={documentCodeId}>
                    {mode === "create"
                      ? "ドキュメントコード（任意）"
                      : "ドキュメントコード"}
                  </FieldLabel>
                  <Input
                    id={documentCodeId}
                    value={values.documentCode}
                    onChange={(event) =>
                      updateValue("documentCode", event.target.value)
                    }
                    aria-invalid={Boolean(errors.documentCode)}
                  />
                  {errors.documentCode ? (
                    <FieldError>{errors.documentCode}</FieldError>
                  ) : null}
                  {mode === "create" && (
                    <FieldDescription>
                      空欄なら保存時に自動で付与します。
                    </FieldDescription>
                  )}
                </Field>

                <Field data-invalid={errors.status ? true : undefined}>
                  <FieldLabel>ステータス</FieldLabel>
                  <Select
                    value={values.status}
                    onValueChange={(value) => updateValue("status", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {REQUIREMENT_DOCUMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.status ? (
                    <FieldError>{errors.status}</FieldError>
                  ) : null}
                </Field>
              </div>

              <div className="grid gap-4 @min-[24rem]/document-form:grid-cols-2 @min-[42rem]/document-form:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={targetSystemNameId}>
                    対象システム
                  </FieldLabel>
                  <Input
                    id={targetSystemNameId}
                    value={values.targetSystemName}
                    onChange={(event) =>
                      updateValue("targetSystemName", event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={clientNameId}>クライアント</FieldLabel>
                  <Input
                    id={clientNameId}
                    value={values.clientName}
                    onChange={(event) =>
                      updateValue("clientName", event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={vendorNameId}>ベンダー</FieldLabel>
                  <Input
                    id={vendorNameId}
                    value={values.vendorName}
                    onChange={(event) =>
                      updateValue("vendorName", event.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 @min-[24rem]/document-form:grid-cols-2">
                <RequirementDocumentUserField
                  projectId={projectId}
                  label="作成者"
                  value={values.authorId}
                  initialUser={initialUsers.author ?? null}
                  onChange={(value) => updateValue("authorId", value)}
                />
                <RequirementDocumentUserField
                  projectId={projectId}
                  label="レビュー担当"
                  value={values.reviewerId}
                  initialUser={initialUsers.reviewer ?? null}
                  onChange={(value) => updateValue("reviewerId", value)}
                />
                <RequirementDocumentUserField
                  projectId={projectId}
                  label="承認者"
                  value={values.approverId}
                  initialUser={initialUsers.approver ?? null}
                  onChange={(value) => updateValue("approverId", value)}
                />
                <Field>
                  <FieldLabel htmlFor={approvedAtId}>承認日時</FieldLabel>
                  <Input
                    id={approvedAtId}
                    type="datetime-local"
                    value={values.approvedAt}
                    onChange={(event) =>
                      updateValue("approvedAt", event.target.value)
                    }
                  />
                </Field>
              </div>
            </FieldGroup>
          </details>

          <FormApiError error={error} />

          <FormSubmitButton isPending={isPending}>
            {mode === "create" ? "保存して要件を書く" : "変更を保存"}
          </FormSubmitButton>
        </FieldGroup>
      </form>

      {conflictValues && onCloseConflict && onResolveConflict ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={values}
          currentValues={conflictValues}
          fieldLabels={REQUIREMENT_DOCUMENT_CONFLICT_FIELD_LABELS}
          isPending={isPending}
          onOpenChange={(open) => !open && onCloseConflict()}
          onResolve={async (resolvedValues) => {
            setValues(resolvedValues);
            await onResolveConflict(prepareValues(resolvedValues));
          }}
        />
      ) : null}
      <DraftRestoreDialog
        open={Boolean(draftScope && draft.pendingDraft)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onRestore={draft.restoreDraft}
        onDiscard={draft.discardDraft}
      />
    </>
  );
}
