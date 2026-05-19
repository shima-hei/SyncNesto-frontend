"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ProjectMemberCreate } from "@/lib/api/generated/model";
import {
  getListProjectMembersProjectsProjectIdMembersGetQueryKey,
  useAddProjectMemberProjectsProjectIdMembersPost,
} from "@/lib/api/generated/projects/projects";

import type { ProjectMemberFormValues } from "../types/project-member-form";

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const addProjectMemberMutation = useAddProjectMemberProjectsProjectIdMembersPost(
    {
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getListProjectMembersProjectsProjectIdMembersGetQueryKey(
                projectId
              ),
          });
          toast.success("プロジェクトメンバーを追加しました。");
        },
        onError: () => {
          toast.error("プロジェクトメンバーの追加に失敗しました。");
        },
      },
    }
  );

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

const toProjectMemberCreate = (
  values: ProjectMemberFormValues
): ProjectMemberCreate => {
  return {
    user_id: Number(values.userId),
    role_key: values.roleKey,
  };
};
