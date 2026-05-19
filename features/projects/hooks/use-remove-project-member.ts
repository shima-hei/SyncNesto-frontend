"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListProjectMembersProjectsProjectIdMembersGetQueryKey,
  useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete,
} from "@/lib/api/generated/projects/projects";

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const removeProjectMemberMutation =
    useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getListProjectMembersProjectsProjectIdMembersGetQueryKey(
                projectId
              ),
          });
          toast.success("プロジェクトメンバーを削除しました。");
        },
        onError: () => {
          toast.error("プロジェクトメンバーの削除に失敗しました。");
        },
      },
    });

  const removeProjectMember = async (userId: number) => {
    await removeProjectMemberMutation.mutateAsync({ projectId, userId });
  };

  return {
    removeProjectMember,
    isPending: removeProjectMemberMutation.isPending,
    error: removeProjectMemberMutation.error,
  };
}
