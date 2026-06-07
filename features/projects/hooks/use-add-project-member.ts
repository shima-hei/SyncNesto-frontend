"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAddProjectMemberProjectsProjectIdMembersPost } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import { invalidateProjectMemberList } from "../lib/project-cache";
import { toProjectMemberCreate } from "../lib/project-mappers";
import type { ProjectMemberFormValues } from "../types/project-member-form";

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const addProjectMemberMutation =
    useAddProjectMemberProjectsProjectIdMembersPost({
      mutation: {
        onSuccess: async () => {
          toast.success(PROJECT_MESSAGES.member.addSuccess);
          await invalidateProjectMemberList(queryClient, projectId);
        },
        onError: () => {
          toast.error(PROJECT_MESSAGES.member.addError);
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
