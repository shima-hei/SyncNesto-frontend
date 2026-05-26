"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import { invalidateProjectMemberList } from "../lib/project-cache";

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const removeProjectMemberMutation =
    useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete({
      mutation: {
        onSuccess: async () => {
          await invalidateProjectMemberList(queryClient, projectId);
          toast.success(PROJECT_MESSAGES.member.removeSuccess);
        },
        onError: () => {
          toast.error(PROJECT_MESSAGES.member.removeError);
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
