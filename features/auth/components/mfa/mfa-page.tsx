"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { logoutUserAuthLogoutPost } from "@/lib/api/generated/auth/auth";
import type { MfaFlowRead } from "@/lib/api/generated/model";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { PublicActionShell } from "../account-actions/public-action-shell";
import { MfaChallenge } from "./mfa-challenge";

export function MfaPage({
  flow,
  returnTo,
}: {
  flow: MfaFlowRead;
  returnTo: string;
}) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <PublicActionShell
      title={flow.next_step === "mfa_verify" ? "追加認証" : "追加認証の登録"}
      description="アカウントを保護するため、追加認証を完了してください。"
    >
      <div className="flex flex-col gap-4">
        <MfaChallenge
          initialState={flow}
          onComplete={() => {
            queryClient.clear();
            window.location.replace(returnTo);
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          disabled={cancelling}
          onClick={async () => {
            setCancelling(true);
            setError(null);
            try {
              await logoutUserAuthLogoutPost();
              queryClient.clear();
              window.location.replace("/login");
            } catch (cause) {
              setError(
                getApiErrorMessage(
                  cause,
                  "認証の取り消しに失敗しました。やり直してください。",
                ),
              );
              setCancelling(false);
            }
          }}
        >
          認証を取り消す
        </Button>
      </div>
    </PublicActionShell>
  );
}
