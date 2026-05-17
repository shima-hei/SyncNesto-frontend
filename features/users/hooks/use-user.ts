"use client";

import { useReadUserUsersUserIdGet } from "@/lib/api/generated/users/users";

export function useUser(userId: number) {
  const userQuery = useReadUserUsersUserIdGet(userId, {
    query: {
      retry: false,
    },
  });

  return {
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    error: userQuery.error,
  };
}

