"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete } from "@/lib/api/generated/projects/projects";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import {
  invalidateProjectMemberCandidateList,
  invalidateProjectMemberList,
  invalidateProjectMemberUserList,
} from "../lib/project-cache";

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const removeProjectMemberMutation =
    useRemoveProjectMemberProjectsProjectIdMembersUserIdDelete({
      mutation: {
        onSuccess: async () => {
          toast.success(PROJECT_MESSAGES.member.removeSuccess);
          await Promise.all([
            invalidateProjectMemberList(queryClient, projectId),
            invalidateProjectMemberUserList(queryClient, projectId),
            invalidateProjectMemberCandidateList(queryClient, projectId),
          ]);
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, PROJECT_MESSAGES.member.removeError)
          );
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
