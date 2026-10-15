"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { isSystemAdmin } from "@/features/auth/utils/authorization";

export function useSystemQuery<T>(
  key: readonly unknown[],
  queryFn: (context: { signal: AbortSignal }) => Promise<T>,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [
      "system-management",
      user?.demo?.id ?? "normal",
      user?.id,
      ...key,
    ],
    queryFn,
    enabled: isSystemAdmin(user),
    retry: false,
  });
}
