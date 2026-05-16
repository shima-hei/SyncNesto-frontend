"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
      },
      onError: (error) => {
        const current = getConflictCurrent<CurrentUserRead>(error);

        if (current) {
          setConflictCurrent(current);
        }
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
