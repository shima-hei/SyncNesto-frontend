"use client";

import { useCallback, useMemo } from "react";

import { useProjectMemberUsers } from "@/features/projects";

export function useTaskUserMap(projectId: number) {
  const { users, isLoading } = useProjectMemberUsers(projectId, {
    limit: 100,
  });
  const usersById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const getTaskUserLabel = useCallback(
    (userId?: number | null) => {
      if (!userId) {
        return "-";
      }

      return usersById.get(userId)?.name ?? `ユーザーID: ${userId}`;
    },
    [usersById],
  );

  return {
    usersById,
    getTaskUserLabel,
    isLoading,
  };
}
