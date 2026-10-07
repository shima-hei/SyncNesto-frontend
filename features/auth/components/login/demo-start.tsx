"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  demoCsrfDemoCsrfGet,
  startDemoDemoStartPost,
} from "@/lib/api/generated/demo/demo";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

export function DemoStart() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setPending(true);
    setError(null);
    try {
      await demoCsrfDemoCsrfGet();
      await startDemoDemoStartPost();
      window.location.replace("/");
    } catch (error) {
      setError(getApiErrorMessage(error));
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">登録せずに体験</h2>
        <p className="text-sm text-muted-foreground">
          要件・タスク・テスト・ドキュメント、組織の管理を試せます。
        </p>
        <p className="text-sm text-muted-foreground">
          入力内容はログアウト・有効期限切れで破棄されます。個人情報や機密情報は入力しないでください。
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => void start()}
      >
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? "デモを準備中…" : "デモを試す"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
