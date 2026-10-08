"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { useAuthQueryClient } from "../../providers/auth-provider";
import { invalidateCurrentUser } from "../../lib/current-user-cache";
import { useAccountActionLink } from "../../hooks/use-account-action-link";
import { accountActionApi } from "../../lib/account-action-api";
import { passwordResetSchema } from "../../schemas/account-action-schema";
import { PublicActionShell } from "./public-action-shell";

export function ResetPasswordPage() {
  const link = useAccountActionLink();
  return <PasswordResetScreen key={link.revision} link={link} />;
}

function PasswordResetScreen({
  link,
}: {
  link: ReturnType<typeof useAccountActionLink>;
}) {
  const authClient = useAuthQueryClient();
  const passwordId = useId();
  const confirmationId = useId();
  const password = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<{
    password?: string;
    passwordConfirmation?: string;
  }>({});
  const reset = useMutation({
    mutationFn: () =>
      accountActionApi.confirmPasswordReset({
        token: link.getToken()!,
        password: password.current!,
      }),
    onSuccess: () => {
      link.clearToken();
      form.current?.reset();
      void invalidateCurrentUser(authClient);
    },
    onSettled: () => {
      password.current = null;
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!link.getToken() || reset.isPending || reset.isSuccess) return;
    const data = new FormData(event.currentTarget);
    const result = passwordResetSchema.safeParse({
      password: data.get("password"),
      passwordConfirmation: data.get("password_confirmation"),
    });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors.password?.[0],
        passwordConfirmation: fieldErrors.passwordConfirmation?.[0],
      });
      return;
    }
    setErrors({});
    password.current = result.data.password;
    reset.mutate();
  };
  return (
    <PublicActionShell
      title="新しいパスワードを設定"
      description="登録したメールアドレスに届いたリンクで、本人がパスワードを設定します。"
    >
      {link.isPending ? (
        <Skeleton className="h-48" />
      ) : link.error ? (
        <div className="flex flex-col gap-4">
          <p role="alert">
            {getApiErrorMessage(link.error, link.error.message)}
          </p>
          <Button asChild variant="outline">
            <Link href="/forgot-password">再設定メールを再発行</Link>
          </Button>
        </div>
      ) : reset.data ? (
        <p role="status">{reset.data.message}</p>
      ) : link.inspection?.purpose !== "password_reset" ? (
        <p role="alert">このリンクはパスワード再設定用ではありません。</p>
      ) : (
        <form ref={form} onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor={passwordId}>新しいパスワード</FieldLabel>
              <Input
                id={passwordId}
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={reset.isPending}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={`${passwordId}-description`}
              />
              <FieldDescription id={`${passwordId}-description`}>
                12〜128文字で設定してください。他のサービスと異なるパスワードを使用してください。
              </FieldDescription>
              {errors.password ? (
                <FieldError>{errors.password}</FieldError>
              ) : null}
            </Field>
            <Field
              data-invalid={errors.passwordConfirmation ? true : undefined}
            >
              <FieldLabel htmlFor={confirmationId}>
                パスワード（確認）
              </FieldLabel>
              <Input
                id={confirmationId}
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={reset.isPending}
                aria-invalid={Boolean(errors.passwordConfirmation)}
              />
              {errors.passwordConfirmation ? (
                <FieldError>{errors.passwordConfirmation}</FieldError>
              ) : null}
            </Field>
            <FormApiError error={reset.error} />
            <FormSubmitButton isPending={reset.isPending}>
              {reset.isPending ? "設定中…" : "パスワードを設定"}
            </FormSubmitButton>
            <p className="text-xs text-muted-foreground">
              設定後は、すべての端末で再ログインが必要です。
            </p>
          </FieldGroup>
        </form>
      )}
    </PublicActionShell>
  );
}
