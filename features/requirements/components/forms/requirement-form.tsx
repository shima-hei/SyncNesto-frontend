"use client";

import { useId, useRef, useState } from "react";
import { initialRequirementValues } from "../../constants/requirement-form";
import { useListNavigation } from "@/hooks/use-list-navigation";
import Link from "next/link";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getConflictFields } from "@/lib/api/conflict";
import { useFormDraft } from "@/hooks/use-form-draft";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/lib/api/generated/model";

import { REQUIREMENT_CONFLICT_FIELD_LABELS } from "../../constants/requirement-conflict-fields";
import {
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  REQUIREMENT_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { requirementSchema } from "../../schemas/requirement-schema";
import type {
  RequirementFormErrors,
  RequirementFormValues,
} from "../../types/requirement-form";
import { RequirementUserSelectField } from "./requirement-user-select-field";

type RequirementFormProps = {
  projectId: number;
  documentId: number;
  mode: "create" | "update";
  initialValues: RequirementFormValues;
  initialOwner?: UserSummary | null;
  draftScope?: string;
  draftResourceId?: number | null;
  className?: string;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: RequirementFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: RequirementFormValues) => Promise<unknown>;
  onSubmit: (
    values: RequirementFormValues,
    options?: { continueCreating?: boolean },
  ) => Promise<unknown>;
};

export function RequirementForm({
  projectId,
  documentId,
  mode,
  initialValues,
  initialOwner,
  draftScope,
  draftResourceId = null,
  className,
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: RequirementFormProps) {
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId,
  );
  const { document: requirementDocument, isLoading: isDocumentLoading } =
    useRequirementDocument(projectId, documentId);
  const sectionId = useId();
  const typeId = useId();
  const priorityId = useId();
  const statusId = useId();
  const categoryId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const rationaleId = useId();
  const acceptanceCriteriaId = useId();
  const sourceId = useId();
  const approvedAtId = useId();
  const changeSummaryId = useId();
  const reasonId = useId();
  const managementRef = useRef<HTMLDetailsElement>(null);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementFormErrors>({});
  const { user } = useAuth();
  const draft = useFormDraft({
    userId: user?.id ?? null,
    scope: draftScope ?? "",
    values,
    initialValues,
    serverDraft: draftScope
      ? {
          enabled: true,
          resourceType: "requirement",
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

    const result = requirementSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        requirementType: fieldErrors.requirementType?.[0],
        title: fieldErrors.title?.[0],
        priority: fieldErrors.priority?.[0],
        status: fieldErrors.status?.[0],
      });
      if (!fieldErrors.title && managementRef.current) {
        managementRef.current.open = true;
      }
      const firstErrorId = fieldErrors.title
        ? titleId
        : fieldErrors.requirementType
          ? typeId
          : fieldErrors.priority
            ? priorityId
            : statusId;
      document.getElementById(firstErrorId)?.focus();
      return;
    }

    setErrors({});
    const continueCreating =
      mode === "create" &&
      (event.nativeEvent.submitter as HTMLElement | null)?.dataset
        .continueCreating === "true";
    await onSubmit(result.data, { continueCreating })
      .then(() => {
        draft.clearDraft();
        if (continueCreating) {
          setValues({
            ...initialRequirementValues,
            sectionId: values.sectionId,
            requirementType: values.requirementType,
            category: values.category,
            priority: values.priority,
            ownerId: values.ownerId,
          });
          document.getElementById(titleId)?.focus();
        }
      })
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementFormValues>(
    field: TKey,
    value: RequirementFormValues[TKey],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const selectedSection = sections.find(
    (section) => String(section.id) === values.sectionId,
  );
  const { returnTo: listPath } = useListNavigation(
    `/projects/joined/${projectId}/requirements/${documentId}?tab=requirements${initialValues.sectionId ? `&sectionId=${initialValues.sectionId}` : ""}`,
  );

  return (
    <>
      <form
        className={cn(
          "@container/requirement-form min-w-0 max-w-4xl",
          className,
        )}
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            <p className="break-words text-muted-foreground">
              要件定義書:{" "}
              {requirementDocument?.title ??
                (isDocumentLoading ? "読み込み中…" : "情報を取得できません")}
              {mode === "update" ? ` / ${values.requirementCode}` : null}
            </p>
            <details>
              <summary className="w-fit cursor-pointer rounded-sm break-words hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                配置先:{" "}
                {selectedSection?.title ??
                  (values.sectionId
                    ? isSectionsLoading
                      ? "セクションを確認中…"
                      : "セクション情報を取得できません"
                    : "セクション未設定")}
                <span className="ml-2 text-xs text-muted-foreground">変更</span>
              </summary>
              <Field className="mt-3">
                <FieldLabel htmlFor={sectionId}>
                  配置先のセクション（任意）
                </FieldLabel>
                <Select
                  value={values.sectionId || "none"}
                  disabled={isSectionsLoading}
                  onValueChange={(value) =>
                    updateValue("sectionId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger id={sectionId} className="w-full">
                    <SelectValue placeholder="セクションを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">セクション未設定</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  未設定のまま作成し、後から分類することもできます。
                </FieldDescription>
              </Field>
            </details>
          </div>

          <FieldSet>
            <FieldLegend>要件の内容</FieldLegend>
            <FieldGroup>
              <Field data-invalid={errors.title ? true : undefined}>
                <FieldLabel htmlFor={titleId}>要件名（必須）</FieldLabel>
                <Input
                  id={titleId}
                  name="title"
                  autoComplete="off"
                  value={values.title}
                  placeholder="例：メールアドレスとパスワードでログインできる…"
                  onChange={(event) => updateValue("title", event.target.value)}
                  aria-required="true"
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title ? <FieldError>{errors.title}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={descriptionId}>
                  要件の内容（任意）
                </FieldLabel>
                <Textarea
                  id={descriptionId}
                  name="description"
                  className="min-h-32"
                  rows={5}
                  autoComplete="off"
                  value={values.description}
                  aria-describedby={`${descriptionId}-help`}
                  placeholder="例：利用者は登録済みのメールアドレスとパスワードを使ってログインできる…"
                  onChange={(event) =>
                    updateValue("description", event.target.value)
                  }
                />
                <FieldDescription id={`${descriptionId}-help`}>
                  誰が、どの場面で、何をできる必要があるかを記入します。
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={acceptanceCriteriaId}>
                  受け入れ条件（任意）
                </FieldLabel>
                <Textarea
                  id={acceptanceCriteriaId}
                  name="acceptanceCriteria"
                  className="min-h-24"
                  rows={4}
                  autoComplete="off"
                  value={values.acceptanceCriteria}
                  aria-describedby={`${acceptanceCriteriaId}-help`}
                  placeholder="例：正しい情報でログインするとホーム画面が開く。誤った情報ではエラーが表示される…"
                  onChange={(event) =>
                    updateValue("acceptanceCriteria", event.target.value)
                  }
                />
                <FieldDescription id={`${acceptanceCriteriaId}-help`}>
                  何を確認できれば、この要件を満たしたと判断できるかを記入します。
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          <details ref={managementRef} className="border-t pt-4">
            <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              分類・担当を設定
            </summary>
            <FieldGroup className="mt-4">
              <FieldGroup className="grid gap-4 @min-[32rem]/requirement-form:grid-cols-3">
                <Field data-invalid={errors.requirementType ? true : undefined}>
                  <FieldLabel htmlFor={typeId}>種別</FieldLabel>
                  <Select
                    value={values.requirementType}
                    onValueChange={(value) =>
                      updateValue("requirementType", value)
                    }
                  >
                    <SelectTrigger
                      id={typeId}
                      className="w-full"
                      aria-invalid={Boolean(errors.requirementType)}
                    >
                      <SelectValue placeholder="種別を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {REQUIREMENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.requirementType ? (
                    <FieldError>{errors.requirementType}</FieldError>
                  ) : null}
                </Field>

                <Field data-invalid={errors.priority ? true : undefined}>
                  <FieldLabel htmlFor={priorityId}>優先度</FieldLabel>
                  <Select
                    value={values.priority}
                    onValueChange={(value) => updateValue("priority", value)}
                  >
                    <SelectTrigger
                      id={priorityId}
                      className="w-full"
                      aria-invalid={Boolean(errors.priority)}
                    >
                      <SelectValue placeholder="優先度を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {REQUIREMENT_PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.priority ? (
                    <FieldError>{errors.priority}</FieldError>
                  ) : null}
                </Field>

                <Field data-invalid={errors.status ? true : undefined}>
                  <FieldLabel htmlFor={statusId}>ステータス</FieldLabel>
                  <Select
                    value={values.status}
                    onValueChange={(value) => updateValue("status", value)}
                  >
                    <SelectTrigger
                      id={statusId}
                      className="w-full"
                      aria-invalid={Boolean(errors.status)}
                    >
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {REQUIREMENT_STATUS_OPTIONS.map((option) => (
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
              </FieldGroup>

              <FieldGroup className="grid gap-4 @min-[32rem]/requirement-form:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={categoryId}>カテゴリ（任意）</FieldLabel>
                  <Input
                    id={categoryId}
                    name="category"
                    autoComplete="off"
                    value={values.category}
                    onChange={(event) =>
                      updateValue("category", event.target.value)
                    }
                  />
                </Field>
                <RequirementUserSelectField
                  projectId={projectId}
                  label="担当者（任意）"
                  value={values.ownerId}
                  initialUser={initialOwner}
                  onChange={(value) => updateValue("ownerId", value)}
                />
              </FieldGroup>
            </FieldGroup>
          </details>

          <details className="border-t pt-4">
            <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              背景・情報源を補足（任意）
            </summary>
            <FieldGroup className="mt-4">
              <Field>
                <FieldLabel htmlFor={rationaleId}>背景・理由</FieldLabel>
                <Textarea
                  id={rationaleId}
                  name="rationale"
                  autoComplete="off"
                  value={values.rationale}
                  onChange={(event) =>
                    updateValue("rationale", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={sourceId}>情報源</FieldLabel>
                <Input
                  id={sourceId}
                  name="source"
                  autoComplete="off"
                  value={values.source}
                  onChange={(event) =>
                    updateValue("source", event.target.value)
                  }
                />
              </Field>
            </FieldGroup>
          </details>

          <details className="border-t pt-4">
            <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              承認情報を確認・編集（任意）
            </summary>
            <FieldGroup className="mt-4 grid gap-4 @min-[32rem]/requirement-form:grid-cols-2">
              <RequirementUserSelectField
                projectId={projectId}
                label="承認者"
                value={values.approvedBy}
                onChange={(value) => updateValue("approvedBy", value)}
              />
              <Field>
                <FieldLabel htmlFor={approvedAtId}>承認日時</FieldLabel>
                <Input
                  id={approvedAtId}
                  name="approvedAt"
                  type="datetime-local"
                  value={values.approvedAt}
                  onChange={(event) =>
                    updateValue("approvedAt", event.target.value)
                  }
                />
              </Field>
            </FieldGroup>
          </details>

          {mode === "update" ? (
            <details className="border-t pt-4">
              <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                変更の記録を追加（任意）
              </summary>
              <FieldGroup className="mt-4 grid gap-4 @min-[32rem]/requirement-form:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={changeSummaryId}>変更概要</FieldLabel>
                  <Input
                    id={changeSummaryId}
                    name="changeSummary"
                    autoComplete="off"
                    value={values.changeSummary}
                    onChange={(event) =>
                      updateValue("changeSummary", event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={reasonId}>変更理由</FieldLabel>
                  <Input
                    id={reasonId}
                    name="reason"
                    autoComplete="off"
                    value={values.reason}
                    onChange={(event) =>
                      updateValue("reason", event.target.value)
                    }
                  />
                </Field>
              </FieldGroup>
            </details>
          ) : null}

          <FormApiError error={error} />

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-3">
            <Button asChild variant="outline">
              <Link href={listPath}>要件一覧へ戻る</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {mode === "create" ? "要件を作成" : "変更を保存"}
            </Button>
            {mode === "create" && (
              <Button
                type="submit"
                variant="outline"
                data-continue-creating="true"
                disabled={isPending}
              >
                保存して続けて作成
              </Button>
            )}
          </div>
        </FieldGroup>
      </form>

      {conflictValues && onCloseConflict && onResolveConflict ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={values}
          currentValues={conflictValues}
          fieldLabels={REQUIREMENT_CONFLICT_FIELD_LABELS}
          isPending={isPending}
          onOpenChange={(open) => !open && onCloseConflict()}
          onResolve={async (resolvedValues) => {
            setValues(resolvedValues);
            await onResolveConflict(resolvedValues);
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
