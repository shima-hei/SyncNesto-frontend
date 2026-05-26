"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useDeleteCurrentUserAvatarAuthMeAvatarDelete,
  useUpdateCurrentUserAvatarAuthMeAvatarPut,
} from "@/lib/api/generated/auth/auth";

import { CURRENT_USER_MESSAGES } from "../constants/current-user-messages";
import { setCurrentUserCache } from "../lib/current-user-cache";

export function useUpdateCurrentUserAvatar() {
  const queryClient = useQueryClient();
  const updateAvatarMutation = useUpdateCurrentUserAvatarAuthMeAvatarPut({
    mutation: {
      onSuccess: (user) => {
        setCurrentUserCache(queryClient, user);
        toast.success(CURRENT_USER_MESSAGES.avatar.updateSuccess);
      },
      onError: () => {
        toast.error(CURRENT_USER_MESSAGES.avatar.updateError);
      },
    },
  });
  const deleteAvatarMutation = useDeleteCurrentUserAvatarAuthMeAvatarDelete({
    mutation: {
      onSuccess: (user) => {
        setCurrentUserCache(queryClient, user);
        toast.success(CURRENT_USER_MESSAGES.avatar.deleteSuccess);
      },
      onError: () => {
        toast.error(CURRENT_USER_MESSAGES.avatar.deleteError);
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

  const deleteCurrentUserAvatar = async () => {
    return deleteAvatarMutation.mutateAsync();
  };

  return {
    updateCurrentUserAvatar,
    deleteCurrentUserAvatar,
    isUpdating: updateAvatarMutation.isPending,
    isDeleting: deleteAvatarMutation.isPending,
    error: updateAvatarMutation.error ?? deleteAvatarMutation.error,
  };
}
