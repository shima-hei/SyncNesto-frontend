"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useDeleteCurrentUserAvatarAuthMeAvatarDelete,
  getReadCurrentUserAuthMeGetQueryKey,
  useUpdateCurrentUserAvatarAuthMeAvatarPut,
} from "@/lib/api/generated/auth/auth";

export function useUpdateCurrentUserAvatar() {
  const queryClient = useQueryClient();
  const updateAvatarMutation = useUpdateCurrentUserAvatarAuthMeAvatarPut({
    mutation: {
      onSuccess: (user) => {
        queryClient.setQueryData(getReadCurrentUserAuthMeGetQueryKey(), user);
        toast.success("アイコン画像を更新しました。");
      },
      onError: () => {
        toast.error("アイコン画像の更新に失敗しました。");
      },
    },
  });
  const deleteAvatarMutation = useDeleteCurrentUserAvatarAuthMeAvatarDelete({
    mutation: {
      onSuccess: (user) => {
        queryClient.setQueryData(getReadCurrentUserAuthMeGetQueryKey(), user);
        toast.success("アイコン画像を削除しました。");
      },
      onError: () => {
        toast.error("アイコン画像の削除に失敗しました。");
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
