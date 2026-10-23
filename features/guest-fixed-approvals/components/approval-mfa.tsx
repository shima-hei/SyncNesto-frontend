"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { startMfaReauthenticationAuthMfaReauthPost } from "@/lib/api/generated/mfa/mfa";

export function ApprovalMfa({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lock = useRef(false);
  return (
    <Alert>
      <AlertTitle>判断依頼の確認には追加認証が必要です</AlertTitle>
      <AlertDescription>
        <p>
          パスワードを確認後、通常の認証アプリまたはパスキーで認証します。共有資料は引き続き閲覧できます。
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError(null);
            const form = event.currentTarget;
            try {
              await startMfaReauthenticationAuthMfaReauthPost({
                password: String(new FormData(form).get("password")),
              });
              router.replace(
                `/mfa?reauth=guest-approval&next=${encodeURIComponent(returnTo)}`,
              );
              router.refresh();
            } catch (failure) {
              setError(failure as Error);
              setBusy(false);
              lock.current = false;
            } finally {
              form.reset();
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="approval-reauth-password">
                現在のパスワード
              </FieldLabel>
              <Input
                id="approval-reauth-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
              />
            </Field>
            <FormApiError error={error} />
            <Button type="submit" disabled={busy}>
              {busy ? "確認しています…" : "追加認証に進む"}
            </Button>
          </FieldGroup>
        </form>
      </AlertDescription>
    </Alert>
  );
}
