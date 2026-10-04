"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/error";
import { accountActionEmailSchema } from "../../schemas/account-action-schema";

export function EmailRequestForm({
  label,
  submitLabel,
  onRequest,
  disabled = false,
  onBusy,
  forbiddenMessage,
}: {
  label: string;
  submitLabel: string;
  onRequest: (email: string) => Promise<{ message: string }>;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
  forbiddenMessage?: string;
}) {
  const emailId = useId();
  const [validationError, setValidationError] = useState<string>();
  const request = useMutation({
    mutationFn: onRequest,
    onMutate: () => onBusy?.(true),
    onSettled: () => onBusy?.(false),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || request.isPending) return;
    const result = accountActionEmailSchema.safeParse({
      email: new FormData(event.currentTarget).get("email"),
    });
    if (!result.success) {
      setValidationError(result.error.flatten().fieldErrors.email?.[0]);
      return;
    }
    setValidationError(undefined);
    request.mutate(result.data.email);
  };
  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={validationError ? true : undefined}>
          <FieldLabel htmlFor={emailId}>{label}</FieldLabel>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            disabled={disabled || request.isPending}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? `${emailId}-error` : undefined}
            onChange={() => {
              setValidationError(undefined);
              request.reset();
            }}
          />
          {validationError ? (
            <FieldError id={`${emailId}-error`}>{validationError}</FieldError>
          ) : null}
        </Field>
        {forbiddenMessage &&
        request.error instanceof ApiError &&
        request.error.code === "FORBIDDEN" ? (
          <FieldError>{forbiddenMessage}</FieldError>
        ) : (
          <FormApiError error={request.error} />
        )}
        {request.data ? <p role="status">{request.data.message}</p> : null}
        <FormSubmitButton isPending={request.isPending} disabled={disabled}>
          {request.isPending ? "送信中…" : submitLabel}
        </FormSubmitButton>
      </FieldGroup>
    </form>
  );
}
