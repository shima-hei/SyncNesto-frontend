"use client";

import { useRouter } from "next/navigation";

import { useLoginUserAuthLoginPost } from "@/lib/api/generated/auth/auth";

import { ApiError } from "@/lib/api/error";
import type { LoginFormValues } from "../types/login";

export function useLogin() {
  const router = useRouter();
  const loginMutation = useLoginUserAuthLoginPost();

  async function login(values: LoginFormValues) {
    await loginMutation.mutateAsync({ data: values });
    router.push("/");
  }

  return {
    login,
    isPending: loginMutation.isPending,
    error: getLoginErrorMessage(loginMutation.error),
  };
}

function getLoginErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "ログインに失敗しました。時間をおいて再度お試しください。";
}
