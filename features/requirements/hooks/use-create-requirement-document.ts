"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementDocumentProjectsProjectIdRequirementDocumentsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementDocumentList } from "../lib/requirement-cache";
import { toRequirementDocumentCreate } from "../lib/requirement-mappers";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

export function useCreateRequirementDocument(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createDocumentMutation =
    useCreateRequirementDocumentProjectsProjectIdRequirementDocumentsPost({
      mutation: {
        onSuccess: async (document) => {
          await invalidateRequirementDocumentList(queryClient, projectId);
          toast.success(REQUIREMENT_MESSAGES.document.createSuccess);
          router.push(`/projects/joined/${projectId}/requirements/${document.id}`);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.document.createError);
        },
      },
    });

  const createRequirementDocument = async (
    values: RequirementDocumentFormValues
  ) => {
    return createDocumentMutation.mutateAsync({
      projectId,
      data: toRequirementDocumentCreate(values),
    });
  };

  return {
    createRequirementDocument,
    isPending: createDocumentMutation.isPending,
    error: createDocumentMutation.error,
  };
}
