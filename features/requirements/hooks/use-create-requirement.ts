"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementProjectsProjectIdRequirementsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementList } from "../lib/requirement-cache";
import { toRequirementCreate } from "../lib/requirement-mappers";
import type { RequirementFormValues } from "../types/requirement-form";

export function useCreateRequirement(projectId: number, documentId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createRequirementMutation =
    useCreateRequirementProjectsProjectIdRequirementsPost({
      mutation: {
        onSuccess: async () => {
          await invalidateRequirementList(queryClient, projectId);
          toast.success(REQUIREMENT_MESSAGES.requirement.createSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.requirement.createError);
        },
      },
    });

  const createRequirement = async (
    values: RequirementFormValues,
    options?: { continueCreating?: boolean },
  ) => {
    const requirement = await createRequirementMutation.mutateAsync({
      projectId,
      data: toRequirementCreate(values, documentId),
    });
    if (!options?.continueCreating)
      router.push(
        `/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`,
      );
    return requirement;
  };

  return {
    createRequirement,
    isPending: createRequirementMutation.isPending,
    error: createRequirementMutation.error,
  };
}
