"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { completeInitialPasswordAuthInitialPasswordPost } from "@/lib/api/generated/auth/auth";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/error";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { useAuthQueryClient } from "../../providers/auth-provider";
import {
  cancelCurrentUserQuery,
  setCurrentUserCache,
} from "../../lib/current-user-cache";
import { passwordResetSchema } from "../../schemas/account-action-schema";
import { useLogout } from "../../hooks/use-logout";
import { PublicActionShell } from "./public-action-shell";

export function InitialPasswordPage({
  expiresAt,
  email,
}: {
  expiresAt?: string | null;
  email: string;
}) {
  const authClient = useAuthQueryClient();
  const logout = useLogout();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const credentials = useRef<{
    current_password: string;
    password: string;
  } | null>(null);
  const [errors, setErrors] = useState<{
    password?: string;
    passwordConfirmation?: string;
  }>({});
  const setup = useMutation({
    mutationFn: () =>
      completeInitialPasswordAuthInitialPasswordPost(credentials.current!),
    onSuccess: async () => {
      form.current?.reset();
      await cancelCurrentUserQuery(authClient);
      setCurrentUserCache(authClient, null);
    },
    onSettled: () => {
      credentials.current = null;
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (setup.isPending || setup.isSuccess) return;
    const data = new FormData(event.currentTarget);
    const result = passwordResetSchema.safeParse({
      password: data.get("password"),
      passwordConfirmation: data.get("password_confirmation"),
    });
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({
        password: fields.password?.[0],
        passwordConfirmation: fields.passwordConfirmation?.[0],
      });
      return;
    }
    setErrors({});
    credentials.current = {
      current_password: String(data.get("current_password")),
      password: result.data.password,
    };
    setup.mutate();
  };
  const [expired] = useState(() =>
    Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now()),
  );
  return (
    <PublicActionShell
      title="ご自身のパスワードを設定"
      description="初回ログインの確認ができました。利用を開始する前に、初回パスワードとは異なるパスワードを設定してください。"
    >
      {setup.data ? (
        <p role="status">{setup.data.message}</p>
      ) : expired ? (
        <div className="flex flex-col gap-3">
          <p role="alert">初回パスワードの有効期限が切れています。</p>
          <Link href="/forgot-password" className="text-primary underline">
            メールでパスワードを再設定する
          </Link>
        </div>
      ) : (
        <form ref={form} onSubmit={submit}>
          <input
            type="hidden"
            name="username"
            autoComplete="username"
            value={email}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-current`}>初回パスワード</FieldLabel>
              <Input
                id={`${id}-current`}
                name="current_password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                disabled={setup.isPending}
              />
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor={`${id}-new`}>新しいパスワード</FieldLabel>
              <Input
                id={`${id}-new`}
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={setup.isPending}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={`${id}-description`}
              />
              <FieldDescription id={`${id}-description`}>
                12〜128文字で設定してください。
              </FieldDescription>
              {errors.password && <FieldError>{errors.password}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(errors.passwordConfirmation)}>
              <FieldLabel htmlFor={`${id}-confirmation`}>
                新しいパスワード（確認）
              </FieldLabel>
              <Input
                id={`${id}-confirmation`}
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={setup.isPending}
                aria-invalid={Boolean(errors.passwordConfirmation)}
              />
              {errors.passwordConfirmation && (
                <FieldError>{errors.passwordConfirmation}</FieldError>
              )}
            </Field>
            {setup.error instanceof ApiError &&
            setup.error.code === "INVALID_CREDENTIALS" ? (
              <p role="alert" className="text-sm text-destructive">
                初回パスワードを確認してください。
              </p>
            ) : (
              <FormApiError error={setup.error} />
            )}
            <FormSubmitButton isPending={setup.isPending}>
              パスワードを設定
            </FormSubmitButton>
            <p className="text-xs text-muted-foreground">
              設定後、新しいパスワードで再ログインしてください。
            </p>
            <Link
              href="/forgot-password"
              className="text-sm text-primary underline"
            >
              初回パスワードが分からない場合
            </Link>
          </FieldGroup>
        </form>
      )}
      {!setup.data && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={logout.isPending || setup.isPending}
            onClick={() => void logout.logout().catch(() => undefined)}
          >
            別のアカウントでログイン
          </Button>
          <FormApiError error={logout.error} />
        </div>
      )}
    </PublicActionShell>
  );
}
