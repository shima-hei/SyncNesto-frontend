"use client";

import { useMutation } from "@tanstack/react-query";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { useAuthQueryClient } from "../../providers/auth-provider";
import { invalidateCurrentUser } from "../../lib/current-user-cache";
import { useAccountActionLink } from "../../hooks/use-account-action-link";
import { accountActionApi } from "../../lib/account-action-api";
import { PublicActionShell } from "./public-action-shell";

export function ConfirmEmailChangePage() {
  const link = useAccountActionLink();
  return <EmailChangeScreen key={link.revision} link={link} />;
}

function EmailChangeScreen({
  link,
}: {
  link: ReturnType<typeof useAccountActionLink>;
}) {
  const authClient = useAuthQueryClient();
  const approve = link.inspection?.purpose === "email_change_approve";
  const confirm = useMutation({
    mutationFn: () => {
      const data = { token: link.getToken()! };
      return approve
        ? accountActionApi.approveEmailChange(data)
        : accountActionApi.confirmEmailChange(data);
    },
    onSuccess: () => {
      link.clearToken();
      if (!approve) void invalidateCurrentUser(authClient);
    },
  });
  const isEmailLink =
    approve || link.inspection?.purpose === "email_change_verify";
  return (
    <PublicActionShell
      title={
        approve ? "メールアドレス変更を承認" : "新しいメールアドレスを確認"
      }
      description="変更には現在のメールアドレスでの承認と、新しいメールアドレスでの確認が必要です。"
    >
      {link.isPending ? (
        <Skeleton className="h-32" />
      ) : link.error ? (
        <p role="alert">{getApiErrorMessage(link.error, link.error.message)}</p>
      ) : confirm.data ? (
        <p role="status">{confirm.data.message}</p>
      ) : !isEmailLink ? (
        <p role="alert">このリンクはメールアドレス変更用ではありません。</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (link.getToken() && !confirm.isPending) confirm.mutate();
          }}
        >
          <FieldGroup>
            <p className="text-sm">
              変更先:{" "}
              <strong className="break-all">
                {link.inspection?.new_email}
              </strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {approve
                ? "承認すると新しいアドレスへ確認メールを送ります。本人が新しいアドレスを確認するまで、ログイン用のメールアドレスは変わりません。"
                : "確認するとログイン用のメールアドレスが変わります。すべての端末で再ログインが必要です。"}
            </p>
            <FormApiError error={confirm.error} />
            <FormSubmitButton isPending={confirm.isPending}>
              {confirm.isPending
                ? "処理中…"
                : approve
                  ? "変更を承認して確認メールを送る"
                  : "このメールアドレスへの変更を確定"}
            </FormSubmitButton>
          </FieldGroup>
        </form>
      )}
    </PublicActionShell>
  );
}
