"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { recoverMfaAuthMfaRecoverPost } from "@/lib/api/generated/mfa/mfa";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { PublicActionShell } from "../account-actions/public-action-shell";

export function MfaRecoverPage() {
  const token = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const takeToken = () => {
      const url = new URL(window.location.href);
      if (url.hash) {
        token.current = new URLSearchParams(url.hash.slice(1)).get("token");
        url.hash = "";
        window.history.replaceState(window.history.state, "", url);
      }
    };
    takeToken();
    window.addEventListener("hashchange", takeToken);
    return () => window.removeEventListener("hashchange", takeToken);
  }, []);
  return (
    <PublicActionShell
      title="追加認証を復旧する"
      description="運営者の本人確認後に届いたリンクと、現在のパスワードが必要です。"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const password = String(
            new FormData(event.currentTarget).get("password") ?? "",
          );
          setBusy(true);
          setError(null);
          try {
            if (!token.current) {
              setError("メール内の再登録リンクを開き直してください。");
              return;
            }
            await recoverMfaAuthMfaRecoverPost({
              token: token.current,
              password,
            });
            token.current = null;
            router.replace("/mfa");
          } catch (cause) {
            setError(getApiErrorMessage(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mfa-recovery-password">
              現在のパスワード
            </FieldLabel>
            <Input
              id="mfa-recovery-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              disabled={busy}
            />
          </Field>
        </FieldGroup>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          確認して認証手段を再登録
        </Button>
      </form>
    </PublicActionShell>
  );
}
