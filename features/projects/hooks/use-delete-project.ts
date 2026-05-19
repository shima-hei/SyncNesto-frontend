"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListProjectsProjectsGetQueryKey,
  getReadProjectProjectsProjectIdGetQueryKey,
  useDeleteProjectProjectsProjectIdDelete,
} from "@/lib/api/generated/projects/projects";

export function useDeleteProject(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProjectProjectsProjectIdDelete({
    mutation: {
      onSuccess: async () => {
        queryClient.removeQueries({
          queryKey: getReadProjectProjectsProjectIdGetQueryKey(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: getListProjectsProjectsGetQueryKey(),
        });
        toast.success("プロジェクトを削除しました。");
        router.push("/projects/management");
      },
      onError: () => {
        toast.error("プロジェクトの削除に失敗しました。");
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
