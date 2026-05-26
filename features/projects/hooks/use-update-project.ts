"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { ProjectRead } from "@/lib/api/generated/model";
import { useUpdateProjectProjectsProjectIdPatch } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import {
  invalidateProjectList,
  setProjectDetailCache,
} from "../lib/project-cache";
import { toProjectUpdate } from "../lib/project-mappers";
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
        setProjectDetailCache(queryClient, projectId, project);
        await invalidateProjectList(queryClient);
        toast.success(PROJECT_MESSAGES.project.updateSuccess);
      },
      onError: (error) => {
        const current = getConflictCurrent<ProjectRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error(PROJECT_MESSAGES.conflict);
          return;
        }

        toast.error(PROJECT_MESSAGES.project.updateError);
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
