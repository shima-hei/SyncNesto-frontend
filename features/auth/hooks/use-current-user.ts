"use client";

import { useReadCurrentUserAuthMeGet } from "@/lib/api/generated/auth/auth";
import { ApiError } from "@/lib/api/error";
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

  const isUnauthorized = isUnauthorizedError(currentUserQuery.error);
  const user = isUnauthorized ? null : currentUserQuery.data ?? null;

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
  return error instanceof ApiError && error.status === 401;
};
