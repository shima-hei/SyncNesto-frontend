"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { UserRead } from "@/lib/api/generated/model";
import { useUpdateUserUsersUserIdPatch } from "@/lib/api/generated/users/users";

import { USER_MESSAGES } from "../constants/user-messages";
import { invalidateUserList, setUserDetailCache } from "../lib/user-cache";
import { toUserUpdate } from "../lib/user-mappers";
import type { UserFormValues } from "../types/user-form";

export function useUpdateUser(userId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] = useState<UserRead | null>(null);
  const updateUserMutation = useUpdateUserUsersUserIdPatch({
    mutation: {
      onSuccess: async (user) => {
        setConflictCurrent(null);
        setUserDetailCache(queryClient, userId, user);
        await invalidateUserList(queryClient);
        toast.success(USER_MESSAGES.updateSuccess);
      },
      onError: (error) => {
        const current = getConflictCurrent<UserRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error(USER_MESSAGES.conflict);
          return;
        }

        toast.error(USER_MESSAGES.updateError);
      },
    },
  });

  const updateUser = async (values: UserFormValues, version: number) => {
    return updateUserMutation.mutateAsync({
      userId,
      data: toUserUpdate(values, version),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateUser,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateUserMutation.isPending,
    error: updateUserMutation.error,
  };
}
