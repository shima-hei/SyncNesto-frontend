"use client";

import { useReadCurrentUserAuthMeGet } from "@/lib/api/generated/auth/auth";
import type { UserRead } from "@/lib/api/generated/model";

export function useCurrentUser() {
  const currentUserQuery = useReadCurrentUserAuthMeGet<UserRead | null>({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
      select: (user) => user,
      throwOnError: false,
    },
  });

  return {
    user: currentUserQuery.data ?? null,
    isLoading: currentUserQuery.isLoading,
    isFetching: currentUserQuery.isFetching,
    isAuthenticated: Boolean(currentUserQuery.data),
    error: currentUserQuery.error,
    refetchUser: currentUserQuery.refetch,
  };
}
