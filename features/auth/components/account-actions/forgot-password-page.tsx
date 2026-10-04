"use client";

import { accountActionApi } from "../../lib/account-action-api";
import { EmailRequestForm } from "./email-request-form";
import { PublicActionShell } from "./public-action-shell";

export function ForgotPasswordPage() {
  return (
    <PublicActionShell
      title="パスワードを再設定"
      description="登録済みのメールアドレスへ再設定用のリンクを送ります。ログインは不要です。"
    >
      <EmailRequestForm
        label="登録済みメールアドレス"
        submitLabel="再設定メールを送る"
        onRequest={(email) => accountActionApi.requestPasswordReset({ email })}
      />
    </PublicActionShell>
  );
}
