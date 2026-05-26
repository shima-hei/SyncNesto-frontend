"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateCurrentUserAuthMePatch } from "@/lib/api/generated/auth/auth";
import type {
  CurrentUserRead,
  UserProfileUpdate,
} from "@/lib/api/generated/model";
import { getConflictCurrent } from "@/lib/api/conflict";

import { CURRENT_USER_MESSAGES } from "../constants/current-user-messages";
import { setCurrentUserCache } from "../lib/current-user-cache";

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<CurrentUserRead | null>(null);
  const updateCurrentUserMutation = useUpdateCurrentUserAuthMePatch({
    mutation: {
      onSuccess: (user) => {
        setConflictCurrent(null);
        setCurrentUserCache(queryClient, user);
        toast.success(CURRENT_USER_MESSAGES.profile.updateSuccess);
      },
      onError: (error) => {
        const current = getConflictCurrent<CurrentUserRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error(CURRENT_USER_MESSAGES.conflict);
          return;
        }

        toast.error(CURRENT_USER_MESSAGES.profile.updateError);
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
