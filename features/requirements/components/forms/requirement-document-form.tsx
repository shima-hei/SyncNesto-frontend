"use client";

import { useId, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import {
  type SelectableUser,
  UserSelect,
} from "@/components/shared/forms/user-select";
import { Button } from "@/components/ui/button";
import {
  Field,
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";
import { getConflictFields } from "@/lib/api/conflict";
import type { UserSummary } from "@/lib/api/generated/model";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

import { REQUIREMENT_DOCUMENT_STATUS_OPTIONS } from "../../constants/requirement-options";
import { requirementDocumentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementDocumentFormErrors,
  RequirementDocumentFormValues,
} from "../../types/requirement-document-form";

type RequirementDocumentFormProps = {
  projectId: number;
  mode: "create" | "update";
  initialValues: RequirementDocumentFormValues;
  initialUsers?: RequirementDocumentUserValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: RequirementDocumentFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: RequirementDocumentFormValues) => Promise<unknown>;
  onSubmit: (values: RequirementDocumentFormValues) => Promise<unknown>;
};

export function RequirementDocumentForm({
  projectId,
  mode,
  initialValues,
  initialUsers = {},
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: RequirementDocumentFormProps) {
  const titleId = useId();
  const documentCodeId = useId();
  const purposeId = useId();
  const targetSystemNameId = useId();
  const clientNameId = useId();
  const vendorNameId = useId();
  const approvedAtId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementDocumentFormErrors>({});
  const conflictFields = conflictValues
    ? getConflictFields({
        original: initialValues as unknown as Record<string, unknown>,
        local: values as unknown as Record<string, unknown>,
        current: conflictValues as unknown as Record<string, unknown>,
      })
    : [];

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementDocumentSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        documentCode: fieldErrors.documentCode?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementDocumentFormValues>(
    field: TKey,
    value: RequirementDocumentFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <>
      <form className="max-w-3xl" onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <Field data-invalid={errors.documentCode ? true : undefined}>
              <FieldLabel htmlFor={documentCodeId}>ドキュメントコード</FieldLabel>
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
              {errors.status ? <FieldError>{errors.status}</FieldError> : null}
            </Field>
          </div>

          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor={titleId}>タイトル</FieldLabel>
            <Input
              id={titleId}
              value={values.title}
              onChange={(event) => updateValue("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={purposeId}>目的</FieldLabel>
            <Textarea
              id={purposeId}
              value={values.purpose}
              onChange={(event) => updateValue("purpose", event.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={targetSystemNameId}>対象システム</FieldLabel>
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

          <div className="grid gap-4 md:grid-cols-2">
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

          {error ? <FieldError>{getApiErrorMessage(error)}</FieldError> : null}

          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {mode === "create" ? "登録" : "更新"}
            </Button>
          </Field>
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
            await onResolveConflict(resolvedValues);
          }}
        />
      ) : null}
    </>
  );
}

type RequirementDocumentUserValues = {
  author?: UserSummary | null;
  reviewer?: UserSummary | null;
  approver?: UserSummary | null;
};

type RequirementDocumentUserFieldProps = {
  projectId: number;
  label: string;
  value: string;
  initialUser?: UserSummary | null;
  onChange: (value: string) => void;
};

function RequirementDocumentUserField({
  projectId,
  label,
  value,
  initialUser,
  onChange,
}: RequirementDocumentUserFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null);
  const { users, isLoading } = useProjectMemberUsers(projectId, {
    q: search.trim() || undefined,
    limit: 20,
  });
  const selectedValue = getSelectedValue({
    value,
    users,
    selectedUser,
    initialUser,
  });

  const handleSelect = (user: SelectableUser) => {
    setSelectedUser(user);
    onChange(String(user.id));
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedUser(null);
    onChange("");
  };

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <UserSelect
            users={users}
            selectedUser={selectedValue}
            open={open}
            search={search}
            isLoading={isLoading}
            placeholder={`${label}を選択`}
            onOpenChange={setOpen}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!value}
          onClick={handleClear}
        >
          解除
        </Button>
      </div>
    </Field>
  );
}

const getFallbackSelectedUser = (value: string): SelectableUser | null => {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return {
    id: userId,
    name: `ユーザーID: ${userId}`,
    email: "ユーザー情報未取得",
    is_active: true,
  };
};

const getSelectedValue = ({
  value,
  users,
  selectedUser,
  initialUser,
}: {
  value: string;
  users: SelectableUser[];
  selectedUser: SelectableUser | null;
  initialUser?: UserSummary | null;
}) => {
  if (!value) {
    return null;
  }

  if (selectedUser?.id === Number(value)) {
    return selectedUser;
  }

  return (
    users.find((user) => String(user.id) === value) ??
    (initialUser && String(initialUser.id) === value ? initialUser : null) ??
    getFallbackSelectedUser(value)
  );
};

const REQUIREMENT_DOCUMENT_CONFLICT_FIELD_LABELS = {
  title: "タイトル",
  documentCode: "ドキュメントコード",
  status: "ステータス",
  purpose: "目的",
  targetSystemName: "対象システム",
  clientName: "クライアント",
  vendorName: "ベンダー",
  authorId: "作成者ID",
  reviewerId: "レビュー担当ID",
  approverId: "承認者ID",
  approvedAt: "承認日時",
} satisfies Partial<Record<keyof RequirementDocumentFormValues, string>>;
