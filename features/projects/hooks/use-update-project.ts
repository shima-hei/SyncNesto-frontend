"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { ProjectRead, ProjectUpdate } from "@/lib/api/generated/model";
import {
  getListProjectsProjectsGetQueryKey,
  getReadProjectProjectsProjectIdGetQueryKey,
  useUpdateProjectProjectsProjectIdPatch,
} from "@/lib/api/generated/projects/projects";

import type { ProjectFormValues } from "../types/project-form";

export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] = useState<ProjectRead | null>(
    null
  );
  const updateProjectMutation = useUpdateProjectProjectsProjectIdPatch({
    mutation: {
      onSuccess: async (project) => {
        setConflictCurrent(null);
        queryClient.setQueryData(
          getReadProjectProjectsProjectIdGetQueryKey(projectId),
          project
        );
        await queryClient.invalidateQueries({
          queryKey: getListProjectsProjectsGetQueryKey(),
        });
        toast.success("プロジェクト情報を更新しました。");
      },
      onError: (error) => {
        const current = getConflictCurrent<ProjectRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error("他の更新と競合しました。");
          return;
        }

        toast.error("プロジェクト情報の更新に失敗しました。");
      },
    },
  });

  const updateProject = async (values: ProjectFormValues, version: number) => {
    return updateProjectMutation.mutateAsync({
      projectId,
      data: toProjectUpdate(values, version),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateProject,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateProjectMutation.isPending,
    error: updateProjectMutation.error,
  };
}

const toProjectUpdate = (
  values: ProjectFormValues,
  version: number
): ProjectUpdate => {
  return {
    version,
    project_code: values.projectCode,
    name: values.name,
    description: values.description || null,
    status: values.status,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
  };
};
