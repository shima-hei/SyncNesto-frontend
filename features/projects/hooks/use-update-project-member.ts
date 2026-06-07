"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { ProjectMemberRead } from "@/lib/api/generated/model";
import { useUpdateProjectMemberProjectsProjectIdMembersUserIdPatch } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import { invalidateProjectMemberList } from "../lib/project-cache";
import { toProjectMemberUpdate } from "../lib/project-mappers";

export function useUpdateProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<ProjectMemberRead | null>(null);
  const updateProjectMemberMutation =
    useUpdateProjectMemberProjectsProjectIdMembersUserIdPatch({
      mutation: {
        onSuccess: async () => {
          setConflictCurrent(null);
          toast.success(PROJECT_MESSAGES.member.updateSuccess);
          await invalidateProjectMemberList(queryClient, projectId);
        },
        onError: (error) => {
          const current = getConflictCurrent<ProjectMemberRead>(error);

          if (current) {
            setConflictCurrent(current);
            toast.error(PROJECT_MESSAGES.conflict);
            return;
          }

          toast.error(PROJECT_MESSAGES.member.updateError);
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
