"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { SYSTEM_ROLE_KEYS } from "@/features/auth/constants/roles";
import {
  getListUsersUsersGetQueryKey,
  useCreateUserUsersPost,
} from "@/lib/api/generated/users/users";
import type { UserCreate } from "@/lib/api/generated/model";

import type { UserFormValues } from "../types/user-form";

export function useCreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createUserMutation = useCreateUserUsersPost({
    mutation: {
      onSuccess: async (user) => {
        await queryClient.invalidateQueries({
          queryKey: getListUsersUsersGetQueryKey(),
        });
        router.push(`/system/users/${user.id}`);
      },
    },
  });

  const createUser = async (values: UserFormValues) => {
    return createUserMutation.mutateAsync({
      data: toUserCreate(values),
    });
  };

  return {
    createUser,
    isPending: createUserMutation.isPending,
    error: createUserMutation.error,
  };
}

const toUserCreate = (values: UserFormValues): UserCreate => {
  return {
    email: values.email,
    name: values.name,
    password: values.password,
    department: values.department || null,
    position: values.position || null,
    is_active: values.isActive,
    system_role_keys: values.isSystemAdmin
      ? [SYSTEM_ROLE_KEYS.systemAdmin]
      : [],
  };
};
