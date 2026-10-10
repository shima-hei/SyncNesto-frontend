"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { MfaFlowRead } from "@/lib/api/generated/model";
import {
  useReadMfaStatusAuthMfaGet,
  startMfaManagementAuthMfaManagePost as manage,
  startMfaReauthenticationAuthMfaReauthPost as reauth,
  removeMfaFactorAuthMfaFactorsFactorIdDelete as remove,
  regenerateMfaCodesAuthMfaRecoveryCodesPost as regenerate,
  cancelMfaAuthMfaCancelPost as cancel,
  renameMfaFactorAuthMfaFactorsFactorIdPatch as rename,
} from "@/lib/api/generated/mfa/mfa";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { MfaChallenge } from "@/features/auth/components/mfa/mfa-challenge";
import { RecoveryCodes } from "@/features/auth/components/mfa/recovery-codes";

export function MfaSecuritySection() {
  const query = useReadMfaStatusAuthMfaGet({ query: { retry: false } });
  const [flow, setFlow] = useState<MfaFlowRead | null>(null);
  const [dialog, setDialog] = useState<
    "reauth" | "manage" | "codes" | "rename" | null
  >(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const close = (cancelFlow = true) => {
    setDialog(null);
    setFlow(null);
    setCodes(null);
    setEditing(null);
    if (cancelFlow && flow) void cancel().catch(() => undefined);
  };
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>追加認証</CardTitle>
        <CardDescription>
          認証アプリ・Passkeyと、紛失に備えた復旧コードを管理します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(error || query.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error ?? getApiErrorMessage(query.error)}
          </p>
        )}
        {query.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            認証手段を読み込んでいます…
          </p>
        )}
        {query.data && (
          <>
            <ul className="divide-y">
              {query.data.factors.map((factor) => (
                <li
                  key={factor.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="break-words text-sm font-medium">
                      {factor.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {factor.kind === "totp" ? "認証アプリ" : "Passkey"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || !query.data.recent}
                      onClick={() => {
                        setEditing({ id: factor.id, name: factor.name });
                        setDialog("rename");
                      }}
                    >
                      名前を変更
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        busy ||
                        !query.data.recent ||
                        query.data.factors.length <= 1
                      }
                      onClick={() => setRemoveId(factor.id)}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              未使用の復旧コード：{query.data.recovery_codes_remaining}
              件。最後の認証手段は削除できません。
            </p>
            {!query.data.recent && (
              <p className="text-sm">
                認証情報を変更する前に、パスワードと認証器で再認証してください。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setFlow(null);
                  setDialog("reauth");
                  setError(null);
                }}
              >
                {query.data.factors.length ? "再認証する" : "追加認証を登録"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !query.data.recent}
                onClick={() =>
                  void run(async () => {
                    setFlow(await manage());
                    setDialog("manage");
                  })
                }
              >
                予備の認証手段を追加
              </Button>
              <Button
                variant="outline"
                disabled={busy || !query.data.recent}
                onClick={() =>
                  void run(async () => {
                    setCodes(await regenerate());
                    setDialog("codes");
                  })
                }
              >
                復旧コードを再発行
              </Button>
            </div>
          </>
        )}
        <Dialog
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <DialogContent className="max-h-[90svh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {dialog === "reauth"
                  ? "本人を再確認"
                  : dialog === "codes"
                    ? "新しい復旧コード"
                    : dialog === "rename"
                      ? "認証器の名前を変更"
                      : "予備の認証手段を追加"}
              </DialogTitle>
              <DialogDescription>
                {dialog === "codes"
                  ? "旧コードは使用できなくなりました。新しいコードを安全に保存してください。"
                  : "認証情報を変更できるのは、直近に追加認証を完了した本人だけです。"}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {dialog === "rename" && editing ? (
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(
                    new FormData(event.currentTarget).get("name") ?? "",
                  );
                  void run(async () => {
                    await rename(editing.id, { name });
                    close(false);
                    await query.refetch();
                  });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mfa-rename">認証器の名前</FieldLabel>
                    <Input
                      id="mfa-rename"
                      name="name"
                      defaultValue={editing.name}
                      required
                      maxLength={100}
                      disabled={busy}
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={busy}>
                  保存
                </Button>
              </form>
            ) : flow ? (
              <MfaChallenge
                key={dialog}
                initialState={flow}
                allowRecovery={false}
                onComplete={async () => {
                  close(false);
                  await query.refetch();
                }}
              />
            ) : dialog === "codes" ? (
              <RecoveryCodes
                codes={codes}
                onContinue={() => {
                  close(false);
                  void query.refetch();
                }}
              />
            ) : dialog === "reauth" ? (
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const password = String(
                    new FormData(event.currentTarget).get("password") ?? "",
                  );
                  void run(async () => setFlow(await reauth({ password })));
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mfa-reauth-password">
                      現在のパスワード
                    </FieldLabel>
                    <Input
                      id="mfa-reauth-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={128}
                      disabled={busy}
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={busy}>
                  パスワードを確認
                </Button>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={removeId !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>認証手段を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                全端末のログインとCodex接続が失効します。残した認証手段でログインし直してください。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const id = removeId;
                  if (id)
                    void run(async () => {
                      await remove(id);
                      window.location.replace("/login");
                    });
                }}
              >
                削除してログアウト
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
