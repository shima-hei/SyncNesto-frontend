"use client";

import { useMutation } from "@tanstack/react-query";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { EmailRequestForm } from "@/features/auth/components/account-actions/email-request-form";
import type { TenantMemberRead } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/error";
import { API_ERROR_FALLBACK_MESSAGES } from "@/lib/messages/api-error-message";
import {
  requestMemberEmailChangeTenantsCurrentMembersUserIdEmailChangePost,
  requestMemberPasswordResetTenantsCurrentMembersUserIdPasswordResetPost,
} from "@/lib/api/generated/tenants/tenants";

export function MemberAccountActions({
  member,
  disabled,
  onBusy,
}: {
  member: TenantMemberRead;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const reset = useMutation({
    mutationFn: () =>
      requestMemberPasswordResetTenantsCurrentMembersUserIdPasswordResetPost(
        member.user_id,
      ),
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
  });
  if (member.status !== "active")
    return (
      <section className="flex flex-col gap-3">
        <Separator />
        <h3 className="text-sm font-medium">ログイン情報の変更申請</h3>
        <p className="text-sm text-muted-foreground">
          停止中の所属には変更メールを送れません。組織内の利用状態を有効にして保存し、所属編集を開き直してから申請してください。
        </p>
      </section>
    );
  return (
    <section className="flex flex-col gap-4">
      <Separator />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">ログイン情報の変更申請</h3>
        <p className="text-xs text-muted-foreground">
          本人がメール内のリンクから変更します。ログイン情報はすべての所属組織に共通です。
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !reset.isPending) reset.mutate();
        }}
      >
        <FieldGroup>
          <p className="text-sm break-all">
            再設定メールの送信先: {member.email}
          </p>
          {reset.error instanceof ApiError &&
          reset.error.code === "FORBIDDEN" ? (
            <FieldError>
              {API_ERROR_FALLBACK_MESSAGES.memberAccountAction}
            </FieldError>
          ) : (
            <FormApiError error={reset.error} />
          )}
          {reset.data ? <p role="status">{reset.data.message}</p> : null}
          <FormSubmitButton isPending={reset.isPending} disabled={disabled}>
            {reset.isPending ? "送信中…" : "パスワード再設定メールを送る"}
          </FormSubmitButton>
        </FieldGroup>
      </form>
      <EmailRequestForm
        label="新しいメールアドレス"
        submitLabel="現在のアドレスへ承認メールを送る"
        disabled={disabled || reset.isPending}
        onBusy={onBusy}
        forbiddenMessage={API_ERROR_FALLBACK_MESSAGES.memberAccountAction}
        onRequest={(new_email) =>
          requestMemberEmailChangeTenantsCurrentMembersUserIdEmailChangePost(
            member.user_id,
            { new_email },
          )
        }
      />
    </section>
  );
}
