"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLoginUserAuthLoginPost } from "@/lib/api/generated/auth/auth";
import { getLoginApiErrorMessage } from "@/lib/messages/api-error-message";

import { invalidateCurrentUser } from "../lib/current-user-cache";
import type { LoginFormValues } from "../types/login";
import {
  loginReturnPathWithFragment,
  withLoginReturnTo,
} from "@/lib/auth/return-path";

export function useLogin(returnTo?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loginMutation = useLoginUserAuthLoginPost();
  const [flowError, setFlowError] = useState<string | null>(null);

  const login = async (values: LoginFormValues) => {
    setFlowError(null);
    const safeReturn = loginReturnPathWithFragment(
      returnTo,
      window.location.hash,
    );
    const response = await loginMutation.mutateAsync({ data: values });
    if (response.next_step?.startsWith("mfa_")) {
      queryClient.clear();
      if (response.next_step === "mfa_recovery") {
        setFlowError(
          "追加認証の復旧支援中です。運営者から届いた再登録リンクを開いてください。",
        );
        return;
      }
      router.replace(withLoginReturnTo("/mfa", safeReturn));
      return;
    }
    await invalidateCurrentUser(queryClient);
    router.replace(
      response.password_change_required
        ? withLoginReturnTo("/initial-password", safeReturn)
        : (safeReturn ?? "/entry"),
    );
  };

  return {
    login,
    isPending: loginMutation.isPending,
    error: flowError ?? getLoginErrorMessage(loginMutation.error),
  };
}

const getLoginErrorMessage = (error: unknown) => {
  return getLoginApiErrorMessage(error);
};
