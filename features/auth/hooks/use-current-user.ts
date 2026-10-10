"use client";

import { useReadCurrentUserAuthMeGet } from "@/lib/api/generated/auth/auth";
import { ApiError } from "@/lib/api/error";
import type { CurrentUserRead } from "@/lib/api/generated/model";

export function useCurrentUser(enabled = true) {
  const currentUserQuery = useReadCurrentUserAuthMeGet<CurrentUserRead | null>({
    query: {
      retry: false,
      enabled,
      staleTime: 5 * 60 * 1000,
      select: (user) => user,
      throwOnError: false,
    },
  });

  const isUnauthorized = isUnauthorizedError(currentUserQuery.error);
  const user =
    !enabled || isUnauthorized ? null : (currentUserQuery.data ?? null);

  return {
    user,
    isLoading: currentUserQuery.isLoading,
    isFetching: currentUserQuery.isFetching,
    isAuthenticated: Boolean(user),
    error: currentUserQuery.error,
    refetchUser: currentUserQuery.refetch,
  };
}

const isUnauthorizedError = (error: unknown) => {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.code === "MFA_REQUIRED")
  );
};
