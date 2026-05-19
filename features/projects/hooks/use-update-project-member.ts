"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  ProjectMemberRead,
  ProjectMemberUpdate,
} from "@/lib/api/generated/model";
import {
  getListProjectMembersProjectsProjectIdMembersGetQueryKey,
  useUpdateProjectMemberProjectsProjectIdMembersUserIdPatch,
} from "@/lib/api/generated/projects/projects";

export function useUpdateProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<ProjectMemberRead | null>(null);
  const updateProjectMemberMutation =
    useUpdateProjectMemberProjectsProjectIdMembersUserIdPatch({
      mutation: {
        onSuccess: async () => {
          setConflictCurrent(null);
          await queryClient.invalidateQueries({
            queryKey:
              getListProjectMembersProjectsProjectIdMembersGetQueryKey(
                projectId
              ),
          });
          toast.success("メンバー権限を更新しました。");
        },
        onError: (error) => {
          const current = getConflictCurrent<ProjectMemberRead>(error);

          if (current) {
            setConflictCurrent(current);
            toast.error("他の更新と競合しました。");
            return;
          }

          toast.error("メンバー権限の更新に失敗しました。");
        },
      },
    });

  const updateProjectMember = async ({
    userId,
    version,
    roleKey,
  }: {
    userId: number;
    version: number;
    roleKey: string;
  }) => {
    return updateProjectMemberMutation.mutateAsync({
      projectId,
      userId,
      data: toProjectMemberUpdate(version, roleKey),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateProjectMember,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateProjectMemberMutation.isPending,
    error: updateProjectMemberMutation.error,
  };
}

const toProjectMemberUpdate = (
  version: number,
  roleKey: string
): ProjectMemberUpdate => {
  return {
    version,
    role_key: roleKey,
  };
};
