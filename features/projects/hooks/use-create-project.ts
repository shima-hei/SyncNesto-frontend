"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ProjectCreate } from "@/lib/api/generated/model";
import {
  getListProjectsProjectsGetQueryKey,
  useCreateProjectProjectsPost,
} from "@/lib/api/generated/projects/projects";

import type { ProjectFormValues } from "../types/project-form";

export function useCreateProject() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createProjectMutation = useCreateProjectProjectsPost({
    mutation: {
      onSuccess: async (project) => {
        await queryClient.invalidateQueries({
          queryKey: getListProjectsProjectsGetQueryKey(),
        });
        toast.success("プロジェクトを登録しました。");
        router.push(`/projects/management/${project.id}`);
      },
      onError: () => {
        toast.error("プロジェクトの登録に失敗しました。");
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

const toProjectCreate = (values: ProjectFormValues): ProjectCreate => {
  return {
    project_code: values.projectCode,
    name: values.name,
    description: values.description || null,
    status: values.status,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
  };
};
