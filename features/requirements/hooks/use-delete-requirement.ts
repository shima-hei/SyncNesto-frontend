"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListRequirementsProjectsProjectIdRequirementsGetQueryKey,
  getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useDeleteRequirementProjectsProjectIdRequirementsRequirementIdDelete,
} from "@/lib/api/generated/requirements/requirements";

export function useDeleteRequirement(
  projectId: number,
  documentId: number,
  requirementId: number
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteRequirementMutation =
    useDeleteRequirementProjectsProjectIdRequirementsRequirementIdDelete({
      mutation: {
        onSuccess: async () => {
          queryClient.removeQueries({
            queryKey:
              getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryKey(
                projectId,
                requirementId
              ),
          });
          queryClient.removeQueries({
            queryKey:
              getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey(
                projectId,
                requirementId
              ),
          });
          await queryClient.invalidateQueries({
            queryKey: getListRequirementsProjectsProjectIdRequirementsGetQueryKey(
              projectId
            ),
          });
          toast.success("要件を削除しました。");
          router.push(`/projects/joined/${projectId}/requirements/${documentId}`);
        },
        onError: () => {
          toast.error("要件の削除に失敗しました。");
        },
      },
    });

  const deleteRequirement = async () => {
    await deleteRequirementMutation.mutateAsync({ projectId, requirementId });
  };

  return {
    deleteRequirement,
    isPending: deleteRequirementMutation.isPending,
    error: deleteRequirementMutation.error,
  };
}
