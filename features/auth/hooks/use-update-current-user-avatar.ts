"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  getReadCurrentUserAuthMeGetQueryKey,
  useUpdateCurrentUserAvatarAuthMeAvatarPut,
} from "@/lib/api/generated/auth/auth";

export function useUpdateCurrentUserAvatar() {
  const queryClient = useQueryClient();
  const updateAvatarMutation = useUpdateCurrentUserAvatarAuthMeAvatarPut({
    mutation: {
      onSuccess: (user) => {
        queryClient.setQueryData(getReadCurrentUserAuthMeGetQueryKey(), user);
      },
    },
  });

  const updateCurrentUserAvatar = async (file: Blob) => {
    return updateAvatarMutation.mutateAsync({
      data: {
        file,
      },
    });
  };

  return {
    updateCurrentUserAvatar,
    isPending: updateAvatarMutation.isPending,
    error: updateAvatarMutation.error,
  };
}
