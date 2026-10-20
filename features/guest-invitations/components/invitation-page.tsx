"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { PublicActionShell } from "@/features/auth/components/account-actions/public-action-shell";
import { logoutUserAuthLogoutPost } from "@/lib/api/generated/auth/auth";
import { startMfaReauthenticationAuthMfaReauthPost } from "@/lib/api/generated/mfa/mfa";
import {
  invitationInspectGuestInvitationsInvitationIdInspectPost as inspect,
  invitationReadGuestInvitationsInvitationIdGet as read,
  invitationRegisterGuestInvitationsInvitationIdRegisterPost as register,
  invitationAcceptGuestInvitationsInvitationIdAcceptPost as accept,
  invitationDeclineGuestInvitationsInvitationIdDeclinePost as decline,
} from "@/lib/api/generated/guest-invitation-recipient/guest-invitation-recipient";
import type { InvitationRecipientRead } from "@/lib/api/generated/model";
import {
  sharedAuthChannel,
  SHARED_AUTH_EVENT,
  SHARED_AUTH_STORAGE_KEY,
} from "@/lib/auth/shared-access-events";
import {
  invitationCommand,
  invitationDate,
  invitationStateLabel,
  invitationTokenFromHash,
} from "../lib/invitations";

export function InvitationPage({ invitationId }: { invitationId: string }) {
  const [info, setInfo] = useState<InvitationRecipientRead | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [masked, setMasked] = useState(true);
  const [confirm, setConfirm] = useState<"accept" | "decline" | null>(null);
  const initialization = useRef<Promise<unknown> | null>(null);
  const revision = useRef(0);
  const lock = useRef(false);
  const operation = useRef<{
    kind: string;
    version: number;
    request_id: string;
  } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const returnTo = `/guest-invitations/${invitationId}`;
  const login = `/login?next=${encodeURIComponent(returnTo)}`;

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setMasked(true);
    try {
      const result = await read(invitationId);
      if (revision.current !== current) return;
      setInfo(result);
      setError(null);
      setMasked(false);
    } catch (failure) {
      if (revision.current !== current) return;
      setInfo(null);
      setError(failure as Error);
      setMasked(false);
    }
  }, [invitationId]);

  useEffect(() => {
    // Reactの再実行でも生tokenを保存・再送せず、URLから直ちに除去する。
    if (!initialization.current) {
      let token = invitationTokenFromHash(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);
      initialization.current = token
        ? inspect(invitationId, { token })
        : Promise.resolve();
      token = undefined;
    }
    let active = true;
    void initialization.current
      .then(() => {
        if (active) return refresh();
      })
      .catch((failure: Error) => {
        if (active) {
          setError(failure);
          setMasked(false);
        }
      });
    return () => {
      active = false;
      revision.current++;
    };
  }, [invitationId, refresh]);

  useEffect(() => {
    const mask = () => {
      revision.current++;
      setMasked(true);
      setInfo(null);
      setConfirm(null);
      form.current?.reset();
    };
    const recheck = () => {
      mask();
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh();
    };
    const visibility = () =>
      document.visibilityState === "hidden" ? mask() : recheck();
    const storage = (event: StorageEvent) => {
      if (event.key === SHARED_AUTH_STORAGE_KEY) recheck();
    };
    const channel = sharedAuthChannel();
    if (channel) channel.onmessage = recheck;
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("offline", mask);
    window.addEventListener("online", recheck);
    window.addEventListener(SHARED_AUTH_EVENT, recheck);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      channel?.close();
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("offline", mask);
      window.removeEventListener("online", recheck);
      window.removeEventListener(SHARED_AUTH_EVENT, recheck);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (!info || info.state !== "pending") return;
    const delay = Math.min(
      new Date(info.expires_at).getTime() - Date.now(),
      2147483647,
    );
    const timer = window.setTimeout(() => void refresh(), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [info, refresh]);

  const run = async (
    kind: "accept" | "decline" | "register",
    event?: FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!info || lock.current || masked) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    if (
      operation.current?.kind !== kind ||
      operation.current.version !== info.version
    )
      operation.current = { kind, ...invitationCommand(info) };
    const { version, request_id } = operation.current;
    try {
      if (kind === "register") {
        const values = new FormData(form.current!);
        const password = String(values.get("password"));
        if (password !== String(values.get("password_confirmation")))
          throw new Error("確認用パスワードが一致しません。");
        const result = await register(invitationId, {
          version,
          request_id,
          name: String(values.get("name")),
          password,
        });
        setInfo(result);
      } else {
        await (kind === "accept" ? accept : decline)(invitationId, {
          version,
          request_id,
        });
        await refresh();
      }
      operation.current = null;
      setConfirm(null);
    } catch (failure) {
      setError(failure as Error);
      // 競合・認証失効を確認し、古い画面から連続実行させない。
      await refresh();
      setError(failure as Error);
    } finally {
      form.current?.reset();
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <PublicActionShell
      title="プロジェクトへの招待"
      description="招待内容を確認して、参加するかどうかを選んでください。"
      loginHref={login}
    >
      <div className="flex flex-col gap-5" aria-busy={busy || masked}>
        {masked ? (
          <p role="status">
            参加条件を確認しています。通信を確認して再読み込みできます。
          </p>
        ) : info ? (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {info.organization_name}
              </p>
              <h2 className="text-lg font-semibold break-words">
                {info.project_name}
              </h2>
              <div>
                <Badge variant="secondary">
                  {invitationStateLabel(info.state)}
                </Badge>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt>招待期限</dt>
                <dd>{invitationDate(info.expires_at)}</dd>
                <dt>参加期限</dt>
                <dd>{invitationDate(info.participation_expires_at)}</dd>
              </dl>
            </div>
            <p className="text-sm text-muted-foreground">
              参加後、個別に共有された要件・設計・添付を確認できます。資料の閲覧許可や承認権限は、参加とは別に設定されます。
            </p>
            {info.next_step === "register" ? (
              <form
                ref={form}
                onSubmit={(event) => void run("register", event)}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${id}-name`}>あなたの氏名</FieldLabel>
                    <Input
                      id={`${id}-name`}
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={255}
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-password`}>
                      パスワード
                    </FieldLabel>
                    <Input
                      id={`${id}-password`}
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={busy}
                    />
                    <FieldDescription>
                      12〜128文字。続けて通常のログイン・追加認証を設定します。
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-confirmation`}>
                      パスワード（確認）
                    </FieldLabel>
                    <Input
                      id={`${id}-confirmation`}
                      name="password_confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={busy}
                    />
                  </Field>
                  <Button type="submit" disabled={busy}>
                    アカウントを設定して次へ
                  </Button>
                </FieldGroup>
              </form>
            ) : info.next_step === "login" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  招待先のメールアドレスでログインしてください。初回は追加認証を設定します。
                </p>
                <Button asChild>
                  <Link href={login} prefetch={false}>
                    ログインして参加を確認
                  </Link>
                </Button>
              </div>
            ) : info.next_step === "mfa" ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (lock.current) return;
                  const target = event.currentTarget;
                  lock.current = true;
                  setBusy(true);
                  setError(null);
                  try {
                    await startMfaReauthenticationAuthMfaReauthPost({
                      password: String(new FormData(target).get("password")),
                    });
                    window.location.replace(
                      `/mfa?reauth=invitation&next=${encodeURIComponent(returnTo)}`,
                    );
                  } catch (failure) {
                    setError(failure as Error);
                    lock.current = false;
                    setBusy(false);
                  } finally {
                    target.reset();
                  }
                }}
              >
                <FieldGroup>
                  <p className="text-sm">
                    {info.current_user_name}
                    （あなた）の参加を保護するため、追加認証を完了してください。
                  </p>
                  <Field>
                    <FieldLabel htmlFor={`${id}-reauth`}>
                      現在のパスワード
                    </FieldLabel>
                    <Input
                      id={`${id}-reauth`}
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={128}
                      disabled={busy}
                    />
                    <FieldDescription>
                      本人確認後、通常の追加認証へ進みます。未設定なら認証器を登録します。
                    </FieldDescription>
                  </Field>
                  <Button disabled={busy}>追加認証に進む</Button>
                </FieldGroup>
              </form>
            ) : info.next_step === "accept" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  {info.current_user_name}（あなた）として参加します。
                </p>
                <Button disabled={busy} onClick={() => setConfirm("accept")}>
                  このプロジェクトに参加する
                </Button>
              </div>
            ) : info.next_step === "wrong_account" ? (
              <div className="flex flex-col gap-3">
                <p role="alert">
                  現在は {info.current_user_name}{" "}
                  としてログインしています。招待先のアカウントに切り替えてください。
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (lock.current) return;
                    lock.current = true;
                    setBusy(true);
                    try {
                      await logoutUserAuthLogoutPost();
                      window.location.replace(login);
                    } catch (failure) {
                      setError(failure as Error);
                      lock.current = false;
                      setBusy(false);
                    }
                  }}
                >
                  ログアウトして招待先でログイン
                </Button>
              </div>
            ) : info.next_step === "accepted" ? (
              <div className="flex flex-col gap-3">
                <p role="status">
                  参加できました。資料がまだ表示されない場合は、共有をお待ちください。
                </p>
                <Button asChild>
                  <Link href="/shared/publications" prefetch={false}>
                    共有された内容へ
                  </Link>
                </Button>
              </div>
            ) : (
              <p role="status">
                この招待は現在受け付けていません。必要な場合は招待者にご確認ください。
              </p>
            )}
            {info.state === "pending" && info.next_step !== "wrong_account" ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm("decline")}
              >
                今回は参加しない
              </Button>
            ) : null}
          </>
        ) : (
          <p role="alert">
            招待を確認できません。期限・取消・再送の有無を招待者へ確認し、最新のメールから開いてください。
          </p>
        )}
        <FormApiError error={error} />
        {!busy ? (
          <Button variant="ghost" onClick={() => void refresh()}>
            状態を再確認
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !busy && setConfirm(null)}
        title={
          confirm === "accept"
            ? "このプロジェクトに参加しますか？"
            : "今回は参加を辞退しますか？"
        }
        description={
          confirm === "accept"
            ? "資料の閲覧許可は別途設定されます。"
            : "辞退した記録が招待者に残ります。再参加には新しい招待が必要です。"
        }
        confirmLabel={confirm === "accept" ? "参加する" : "辞退する"}
        isPending={busy}
        onConfirm={() => {
          if (confirm) return run(confirm);
        }}
      />
    </PublicActionShell>
  );
}
