"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  getReadCurrentUserAuthMeGetQueryKey,
  useLogoutUserAuthLogoutPost,
} from "@/lib/api/generated/auth/auth";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutUserAuthLogoutPost();

  const logout = async () => {
    await logoutMutation.mutateAsync();
    await queryClient.cancelQueries({
      queryKey: getReadCurrentUserAuthMeGetQueryKey(),
    });
    queryClient.setQueryData(getReadCurrentUserAuthMeGetQueryKey(), null);
    router.replace("/login");
    router.refresh();
  };

  return {
    logout,
    isPending: logoutMutation.isPending,
    error: logoutMutation.error,
  };
}
