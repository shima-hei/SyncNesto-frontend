"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getReadCurrentUserAuthMeGetQueryKey,
  useUpdateCurrentUserAuthMePatch,
} from "@/lib/api/generated/auth/auth";
import type {
  CurrentUserRead,
  UserProfileUpdate,
} from "@/lib/api/generated/model";
import { getConflictCurrent } from "@/lib/api/conflict";

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<CurrentUserRead | null>(null);
  const updateCurrentUserMutation = useUpdateCurrentUserAuthMePatch({
    mutation: {
      onSuccess: (user) => {
        setConflictCurrent(null);
        queryClient.setQueryData(getReadCurrentUserAuthMeGetQueryKey(), user);
        toast.success("アカウント情報を更新しました。");
      },
      onError: (error) => {
        const current = getConflictCurrent<CurrentUserRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error("他の更新と競合しました。");
          return;
        }

        toast.error("アカウント情報の更新に失敗しました。");
      },
    },
  });

  const updateCurrentUser = async (data: UserProfileUpdate) => {
    return updateCurrentUserMutation.mutateAsync({ data });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateCurrentUser,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateCurrentUserMutation.isPending,
    error: updateCurrentUserMutation.error,
  };
}
