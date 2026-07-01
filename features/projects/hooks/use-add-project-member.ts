"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAddProjectMemberProjectsProjectIdMembersPost } from "@/lib/api/generated/projects/projects";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import {
  invalidateProjectMemberCandidateList,
  invalidateProjectMemberList,
  invalidateProjectMemberUserList,
} from "../lib/project-cache";
import { toProjectMemberCreate } from "../lib/project-mappers";
import type { ProjectMemberFormValues } from "../types/project-member-form";

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const addProjectMemberMutation =
    useAddProjectMemberProjectsProjectIdMembersPost({
      mutation: {
        onSuccess: async () => {
          toast.success(PROJECT_MESSAGES.member.addSuccess);
          await Promise.all([
            invalidateProjectMemberList(queryClient, projectId),
            invalidateProjectMemberUserList(queryClient, projectId),
            invalidateProjectMemberCandidateList(queryClient, projectId),
          ]);
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, PROJECT_MESSAGES.member.addError),
          );
        },
      },
    });

  const addProjectMember = async (values: ProjectMemberFormValues) => {
    return addProjectMemberMutation.mutateAsync({
      projectId,
      data: toProjectMemberCreate(values),
    });
  };

  return {
    addProjectMember,
    isPending: addProjectMemberMutation.isPending,
    error: addProjectMemberMutation.error,
  };
}
