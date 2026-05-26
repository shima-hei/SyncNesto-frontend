"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateUserUsersPost } from "@/lib/api/generated/users/users";

import { USER_MESSAGES } from "../constants/user-messages";
import { invalidateUserList } from "../lib/user-cache";
import { toUserCreate } from "../lib/user-mappers";
import type { UserFormValues } from "../types/user-form";

export function useCreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createUserMutation = useCreateUserUsersPost({
    mutation: {
      onSuccess: async (user) => {
        await invalidateUserList(queryClient);
        toast.success(USER_MESSAGES.createSuccess);
        router.push(`/system/users/${user.id}`);
      },
      onError: () => {
        toast.error(USER_MESSAGES.createError);
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
