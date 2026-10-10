"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { MfaFlowRead, MfaTotpSetup } from "@/lib/api/generated/model";
import {
  authenticatePasskeyOptionsAuthMfaPasskeysAuthenticateOptionsPost as authOptions,
  registerPasskeyOptionsAuthMfaPasskeysRegisterOptionsPost as registerOptions,
  verifyMfaPasskeyAuthMfaPasskeysVerifyPost as verifyPasskey,
  setupTotpAuthMfaTotpSetupPost as setupTotp,
  verifyMfaCodeAuthMfaVerifyCodePost as verifyCode,
  finishMfaAuthMfaFinishPost as finish,
} from "@/lib/api/generated/mfa/mfa";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { RecoveryCodes } from "./recovery-codes";

export function MfaChallenge({
  initialState,
  onComplete,
  allowRecovery = true,
}: {
  initialState: MfaFlowRead;
  onComplete: () => Promise<void> | void;
  allowRecovery?: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [totp, setTotp] = useState<MfaTotpSetup | null>(null);
  const [name, setName] = useState("個人の認証器");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setup = state.next_step === "mfa_setup";
  const apply = async (next: MfaFlowRead) => {
    if (next.next_step === "authenticated") await onComplete();
    else {
      setState(next);
      setTotp(null);
    }
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          "認証を完了できませんでした。操作をやり直してください。",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const passkey = () =>
    run(async () => {
      const { startRegistration, startAuthentication } =
        await import("@simplewebauthn/browser");
      if (setup) {
        if (!name.trim()) {
          setError("認証器の名前を入力してください。");
          return;
        }
        const options = await registerOptions({ name });
        setTotp(null);
        const credential = await startRegistration({
          optionsJSON: options,
        });
        await apply(await verifyPasskey({ credential: { ...credential } }));
      } else {
        const options = await authOptions();
        const credential = await startAuthentication({
          optionsJSON: options,
        });
        await apply(await verifyPasskey({ credential: { ...credential } }));
      }
    });
  return (
    <div className="flex flex-col gap-4" aria-busy={busy}>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {state.next_step === "recovery_codes" ? (
        <RecoveryCodes
          codes={state.recovery_codes}
          busy={busy}
          onContinue={() => void run(async () => apply(await finish()))}
        />
      ) : (
        <>
          {setup && (
            <>
              <p className="text-sm text-muted-foreground">
                認証アプリまたはPasskeyを登録してください。登録後、アカウント画面から予備の認証手段を追加できます。
              </p>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="mfa-factor-name">
                    認証器の名前
                  </FieldLabel>
                  <Input
                    id="mfa-factor-name"
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy || Boolean(totp)}
                  />
                </Field>
              </FieldGroup>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    void run(async () => {
                      setTotp(await setupTotp({ name }));
                    })
                  }
                >
                  認証アプリを登録
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !name.trim()}
                  onClick={() => void passkey()}
                >
                  Passkeyを登録
                </Button>
              </div>
            </>
          )}
          {totp && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm">
                認証アプリでQRコードを読み取り、表示された6桁のコードを入力してください。
              </p>
              <Image
                src={totp.qr_data_url}
                alt="認証アプリ登録用QRコード"
                width={240}
                height={240}
                unoptimized
                className="rounded-md border bg-white"
              />
              <details className="max-w-full text-sm">
                <summary className="cursor-pointer">手動で登録する場合</summary>
                <code className="break-all select-all">
                  {new URL(totp.provisioning_uri).searchParams.get("secret")}
                </code>
              </details>
            </div>
          )}
          {!setup && state.methods?.includes("passkey") && !recovery && (
            <Button disabled={busy} onClick={() => void passkey()}>
              Passkeyで確認
            </Button>
          )}
          {(totp ||
            (!setup && (recovery || state.methods?.includes("totp")))) && (
            <form
              key={recovery ? "recovery" : "totp"}
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const code = String(
                  new FormData(event.currentTarget).get("code") ?? "",
                ).trim();
                void run(async () =>
                  apply(await verifyCode({ code, recovery })),
                );
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="mfa-code">
                    {recovery ? "復旧コード" : "認証コード（6桁）"}
                  </FieldLabel>
                  <Input
                    id="mfa-code"
                    name="code"
                    autoComplete={recovery ? "off" : "one-time-code"}
                    inputMode={recovery ? "text" : "numeric"}
                    pattern={recovery ? undefined : "[0-9]{6}"}
                    maxLength={recovery ? 100 : 6}
                    required
                    disabled={busy}
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={busy}>
                コードを確認
              </Button>
            </form>
          )}
          {!setup && allowRecovery && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setRecovery(!recovery)}
            >
              {recovery ? "登録済みの認証手段に戻る" : "復旧コードを使う"}
            </Button>
          )}
        </>
      )}
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          確認しています…
        </p>
      )}
    </div>
  );
}
