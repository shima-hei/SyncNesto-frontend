"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateProjectProjectsPost } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import { invalidateProjectList } from "../lib/project-cache";
import { toProjectCreate } from "../lib/project-mappers";
import type { ProjectFormValues } from "../types/project-form";

export function useCreateProject() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createProjectMutation = useCreateProjectProjectsPost({
    mutation: {
      onSuccess: async (project) => {
        await invalidateProjectList(queryClient);
        toast.success(PROJECT_MESSAGES.project.createSuccess);
        router.push(`/projects/management/${project.id}`);
      },
      onError: () => {
        toast.error(PROJECT_MESSAGES.project.createError);
      },
    },
  });

  const createProject = async (values: ProjectFormValues) => {
    return createProjectMutation.mutateAsync({
      data: toProjectCreate(values),
    });
  };

  return {
    createProject,
    isPending: createProjectMutation.isPending,
    error: createProjectMutation.error,
  };
}
