"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useLogoutUserAuthLogoutPost } from "@/lib/api/generated/auth/auth";
import { clearDemoData } from "@/lib/demo/session";

import {
  cancelCurrentUserQuery,
  setCurrentUserCache,
} from "../lib/current-user-cache";
import { useAuthQueryClient } from "../providers/auth-provider";

export function useLogout() {
  const queryClient = useQueryClient();
  const authQueryClient = useAuthQueryClient();
  const logoutMutation = useLogoutUserAuthLogoutPost();

  const logout = async () => {
    await logoutMutation.mutateAsync();
    clearDemoData();
    await cancelCurrentUserQuery(authQueryClient);
    setCurrentUserCache(authQueryClient, null);
    queryClient.clear();
    authQueryClient.clear();
    window.location.replace("/login");
  };

  return {
    logout,
    isPending: logoutMutation.isPending,
    error: logoutMutation.error,
  };
}
