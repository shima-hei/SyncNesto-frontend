"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  getReadCurrentUserAuthMeGetQueryKey,
  useLoginUserAuthLoginPost,
} from "@/lib/api/generated/auth/auth";
import { getLoginApiErrorMessage } from "@/lib/messages/api-error-message";

import type { LoginFormValues } from "../types/login";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loginMutation = useLoginUserAuthLoginPost();

  const login = async (values: LoginFormValues) => {
    await loginMutation.mutateAsync({ data: values });
    await queryClient.invalidateQueries({
      queryKey: getReadCurrentUserAuthMeGetQueryKey(),
    });
    router.push("/");
  };

  return {
    login,
    isPending: loginMutation.isPending,
    error: getLoginErrorMessage(loginMutation.error),
  };
}

const getLoginErrorMessage = (error: unknown) => {
  return getLoginApiErrorMessage(error);
};
