"use client";

import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiError } from "@/lib/api/error";
import type { NotificationEmailPreferences } from "@/lib/api/generated/model";
import {
  getNotificationEmailPreferencesNotificationPreferencesGet as getPreferences,
  updateNotificationEmailPreferencesNotificationPreferencesPatch as updatePreferences,
} from "@/lib/api/generated/notification-preferences/notification-preferences";
import { announceSharedAuthChange } from "@/lib/auth/shared-access-events";

export function EmailPreferences() {
  const { user } = useAuth();
  return user ? <PreferencePanel key={user.id} userId={user.id} /> : null;
}

function PreferencePanel({ userId }: { userId: number }) {
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.style.visibility = hidden ? "hidden" : "";
  }, []);
  const load = useCallback(
    (signal: AbortSignal) => getPreferences({ signal, cache: "no-store" }),
    [],
  );
  const data = useFreshShared(`email-preferences:${userId}`, load, mask);
  return (
    <Card ref={root} size="sm" aria-label="承認メールの設定">
      <CardHeader>
        <CardTitle>承認メール</CardTitle>
        <CardDescription>
          あなたが参加するすべての案件で共通の設定です。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error ? (
          <Alert>
            <AlertTitle>メール設定を確認できませんでした</AlertTitle>
            <AlertDescription>
              <p>
                {data.error instanceof ApiError &&
                data.error.code === "MFA_REQUIRED"
                  ? "追加認証を完了してから、もう一度確認してください。"
                  : "ログインと接続状況を確認して、再読み込みしてください。"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void data.refresh()}
              >
                再読み込み
              </Button>
            </AlertDescription>
          </Alert>
        ) : data.value && data.operationSignal ? (
          <PreferenceForm
            key={`${userId}:${data.value.version}`}
            value={data.value}
            signal={data.operationSignal}
            userId={userId}
            refresh={data.refresh}
          />
        ) : (
          <Skeleton className="h-20 w-full" aria-label="メール設定を確認中" />
        )}
      </CardContent>
    </Card>
  );
}

function PreferenceForm({
  value,
  signal,
  userId,
  refresh,
}: {
  value: NotificationEmailPreferences;
  signal: AbortSignal;
  userId: number;
  refresh: () => Promise<void>;
}) {
  const id = useId();
  const [enabled, setEnabled] = useState(value.fixed_approval_email_enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current || signal.aborted) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await updatePreferences(
        { fixed_approval_email_enabled: enabled, version: value.version },
        { signal, headers: { "X-Syncnesto-Expected-User": String(userId) } },
      );
      if (signal.aborted) return;
      toast.success("承認メールの設定を保存しました");
      announceSharedAuthChange();
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 409) {
        toast.error(
          "別の画面で設定が変わりました。最新の設定を確認して、もう一度選んでください。",
        );
        await refresh();
      } else {
        setError(
          "保存できませんでした。ログインと追加認証を確認し、再読み込みしてからお試しください。",
        );
      }
    } finally {
      lock.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex flex-col gap-3"
    >
      <FieldGroup>
        <Field orientation="horizontal">
          <Checkbox
            id={id}
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
            disabled={
              busy || (!value.available && !value.fixed_approval_email_enabled)
            }
            aria-describedby={`${id}-description`}
          />
          <FieldContent>
            <FieldLabel htmlFor={id}>承認通知をメールでも受け取る</FieldLabel>
            <FieldDescription id={`${id}-description`}>
              初期設定はOFFです。保存後に届く確認依頼・結果更新・取消を、対象の種類と名称付きでお知らせします。本文・判断理由・添付は含みません。
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
      {value.pause_reason === "identity_changed" ? (
        <p className="text-sm text-muted-foreground">
          通知先が変わったため停止しています。現在の通知先で受け取る場合は、改めてONにして保存してください。
        </p>
      ) : null}
      {!value.available ? (
        <p className="text-sm text-muted-foreground">
          現在、このアカウントではメール通知を有効にできません。アプリ内の通知は引き続き確認できます。
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        招待・認証メールには影響しません。公開停止後も、届いたメールに対象名は残ります。
      </p>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>設定を保存できませんでした</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
            >
              再読み込み
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={
          busy ||
          enabled === value.fixed_approval_email_enabled ||
          (!value.available && enabled)
        }
      >
        {busy ? "保存中…" : "設定を保存"}
      </Button>
    </form>
  );
}
