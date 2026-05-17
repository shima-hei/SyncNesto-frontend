"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SYSTEM_ROLE_KEYS } from "@/features/auth/constants/roles";
import { getConflictCurrent } from "@/lib/api/conflict";
import type { UserRead, UserUpdate } from "@/lib/api/generated/model";
import {
  getListUsersUsersGetQueryKey,
  getReadUserUsersUserIdGetQueryKey,
  useUpdateUserUsersUserIdPatch,
} from "@/lib/api/generated/users/users";

import type { UserFormValues } from "../types/user-form";

export function useUpdateUser(userId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] = useState<UserRead | null>(null);
  const updateUserMutation = useUpdateUserUsersUserIdPatch({
    mutation: {
      onSuccess: async (user) => {
        setConflictCurrent(null);
        queryClient.setQueryData(getReadUserUsersUserIdGetQueryKey(userId), user);
        await queryClient.invalidateQueries({
          queryKey: getListUsersUsersGetQueryKey(),
        });
      },
      onError: (error) => {
        const current = getConflictCurrent<UserRead>(error);

        if (current) {
          setConflictCurrent(current);
        }
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

const toUserUpdate = (
  values: UserFormValues,
  version: number
): UserUpdate => {
  return {
    version,
    email: values.email,
    name: values.name,
    password: values.password || null,
    department: values.department || null,
    position: values.position || null,
    is_active: values.isActive,
    system_role_keys: values.isSystemAdmin
      ? [SYSTEM_ROLE_KEYS.systemAdmin]
      : [],
  };
};
