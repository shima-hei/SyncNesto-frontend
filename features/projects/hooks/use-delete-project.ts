"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteProjectProjectsProjectIdDelete } from "@/lib/api/generated/projects/projects";

import { PROJECT_MESSAGES } from "../constants/project-messages";
import {
  invalidateProjectList,
  removeProjectDetailCache,
} from "../lib/project-cache";

export function useDeleteProject(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProjectProjectsProjectIdDelete({
    mutation: {
      onSuccess: async () => {
        removeProjectDetailCache(queryClient, projectId);
        await invalidateProjectList(queryClient);
        toast.success(PROJECT_MESSAGES.project.deleteSuccess);
        router.push("/projects/management");
      },
      onError: () => {
        toast.error(PROJECT_MESSAGES.project.deleteError);
      },
    },
  });

  const deleteProject = async () => {
    await deleteProjectMutation.mutateAsync({ projectId });
  };

  return {
    deleteProject,
    isPending: deleteProjectMutation.isPending,
    error: deleteProjectMutation.error,
  };
}
