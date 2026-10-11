"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/features/auth/providers/auth-provider";
import { approveMfaRecoveryUsersUserIdMfaRecoveryPost as approve } from "@/lib/api/generated/mfa/mfa";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

export function UserMfaRecovery({
  userId,
  email,
}: {
  userId: number;
  email: string;
}) {
  const { user } = useAuth();
  const [method, setMethod] = useState<
    "in_person" | "previously_verified_channel"
  >("in_person");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!user || user.id === userId || user.demo) return null;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>追加認証の復旧支援</CardTitle>
        <CardDescription>
          全ての認証手段を失った本人に、本人確認後の再登録を案内します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setReview(true);
          }}
        >
          <p className="text-sm text-muted-foreground">
            メールの返信だけで本人確認を完了しないでください。運営者自身の再認証は
            <Link className="underline" href="/account">
              アカウント画面
            </Link>
            で行います。
          </p>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="mfa-identity-method">
                本人確認方法
              </FieldLabel>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as typeof method)}
                disabled={busy}
              >
                <SelectTrigger id="mfa-identity-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="in_person">対面で確認</SelectItem>
                    <SelectItem value="previously_verified_channel">
                      事前に確認済みの連絡経路で確認
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="mfa-identity-reason">
                復旧理由・確認の記録
              </FieldLabel>
              <Textarea
                id="mfa-identity-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={500}
                required
                disabled={busy}
                placeholder="身分証の画像・番号、パスワード等の秘密は記載しないでください。"
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="mfa-identity-confirmed"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                disabled={busy}
              />
              <FieldLabel htmlFor="mfa-identity-confirmed">
                このユーザーの本人確認を完了しました
              </FieldLabel>
            </Field>
          </FieldGroup>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={busy || !confirmed}>
            復旧の内容を確認
          </Button>
        </form>
        <AlertDialog open={review} onOpenChange={setReview}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                本人確認後の再登録を案内しますか？
              </AlertDialogTitle>
              <AlertDialogDescription>
                {email}{" "}
                に30分有効な再登録リンクを送ります。このユーザーの既存認証手段・全ログイン・Codex接続は失効します。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>戻る</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  setMessage(null);
                  try {
                    await approve(userId, {
                      verification_method: method,
                      identity_confirmed: true,
                      reason,
                    });
                    setMessage("再登録の案内を送信しました。");
                    setReason("");
                    setConfirmed(false);
                  } catch (cause) {
                    setError(getApiErrorMessage(cause));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                既存認証を失効して案内を送る
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
