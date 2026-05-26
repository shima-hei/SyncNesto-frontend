"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementProjectsProjectIdRequirementsRequirementIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementList,
  removeRequirementDetailCache,
} from "../lib/requirement-cache";

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
          removeRequirementDetailCache(queryClient, projectId, requirementId);
          await invalidateRequirementList(queryClient, projectId);
          toast.success(REQUIREMENT_MESSAGES.requirement.deleteSuccess);
          router.push(`/projects/joined/${projectId}/requirements/${documentId}`);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.requirement.deleteError);
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
