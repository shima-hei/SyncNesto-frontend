"use client";

import { useMutation } from "@tanstack/react-query";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { EmailRequestForm } from "@/features/auth/components/account-actions/email-request-form";
import { accountActionApi } from "@/features/auth/lib/account-action-api";
import type { CurrentUserRead } from "@/lib/api/generated/model";

export function AccountCredentialsSection({ user }: { user: CurrentUserRead }) {
  const reset = useMutation({
    mutationFn: () =>
      accountActionApi.requestPasswordReset({ email: user.email }),
  });
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">ログイン情報</h2>
        <p className="text-sm text-muted-foreground">
          メールアドレスとパスワードは、すべての所属組織で共通です。
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!reset.isPending) reset.mutate();
        }}
        className="max-w-xl"
      >
        <FieldGroup>
          <p className="text-sm break-all">
            パスワード再設定用のリンクを {user.email} へ送ります。
          </p>
          <FormApiError error={reset.error} />
          {reset.data ? <p role="status">{reset.data.message}</p> : null}
          <FormSubmitButton isPending={reset.isPending}>
            {reset.isPending ? "送信中…" : "パスワード再設定メールを送る"}
          </FormSubmitButton>
        </FieldGroup>
      </form>
      <Separator />
      <p className="text-sm text-muted-foreground">
        メール変更は現在のアドレスで承認した後、新しいアドレスで確認してください。
      </p>
      <EmailRequestForm
        label="新しいメールアドレス"
        submitLabel="現在のアドレスへ承認メールを送る"
        onRequest={(new_email) =>
          accountActionApi.requestEmailChange({ new_email })
        }
      />
    </section>
  );
}
