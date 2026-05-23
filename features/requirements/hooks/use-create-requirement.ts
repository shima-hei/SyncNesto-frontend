"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementCreate } from "@/lib/api/generated/model";
import {
  getListRequirementsProjectsProjectIdRequirementsGetQueryKey,
  useCreateRequirementProjectsProjectIdRequirementsPost,
} from "@/lib/api/generated/requirements/requirements";

import { toOptionalNumber } from "../constants/requirement-form";
import type { RequirementFormValues } from "../types/requirement-form";

export function useCreateRequirement(projectId: number, documentId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createRequirementMutation =
    useCreateRequirementProjectsProjectIdRequirementsPost({
      mutation: {
        onSuccess: async (requirement) => {
          await queryClient.invalidateQueries({
            queryKey: getListRequirementsProjectsProjectIdRequirementsGetQueryKey(
              projectId
            ),
          });
          toast.success("要件を登録しました。");
          router.push(
            `/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`
          );
        },
        onError: () => {
          toast.error("要件の登録に失敗しました。");
        },
      },
    });

  const createRequirement = async (values: RequirementFormValues) => {
    return createRequirementMutation.mutateAsync({
      projectId,
      data: toRequirementCreate(values, documentId),
    });
  };

  return {
    createRequirement,
    isPending: createRequirementMutation.isPending,
    error: createRequirementMutation.error,
  };
}

const toRequirementCreate = (
  values: RequirementFormValues,
  documentId: number
): RequirementCreate => {
  return {
    document_id: documentId,
    requirement_code: values.requirementCode,
    requirement_type: values.requirementType,
    category: values.category || null,
    title: values.title,
    description: values.description || null,
    rationale: values.rationale || null,
    acceptance_criteria: values.acceptanceCriteria || null,
    priority: values.priority,
    status: values.status,
    source: values.source || null,
    owner_id: toOptionalNumber(values.ownerId),
    approved_by: toOptionalNumber(values.approvedBy),
    approved_at: values.approvedAt || null,
  };
};
