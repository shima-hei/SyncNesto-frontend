"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { requirementListHref } from "../lib/requirement-entry";

import { useDeleteRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementDocumentList,
  removeRequirementDocumentDetailCache,
} from "../lib/requirement-cache";

export function useDeleteRequirementDocument(
  projectId: number,
  documentId: number,
) {
  const router = useRouter();
  const { returnTo } = useListNavigation(requirementListHref(projectId));
  const queryClient = useQueryClient();
  const deleteDocumentMutation =
    useDeleteRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            removeRequirementDocumentDetailCache(
              queryClient,
              projectId,
              documentId,
            );
            await invalidateRequirementDocumentList(queryClient, projectId);
            toast.success(REQUIREMENT_MESSAGES.document.deleteSuccess);
            router.push(requirementListHref(projectId, returnTo));
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.document.deleteError);
          },
        },
      },
    );

  const deleteRequirementDocument = async () => {
    await deleteDocumentMutation.mutateAsync({ projectId, documentId });
  };

  return {
    deleteRequirementDocument,
    isPending: deleteDocumentMutation.isPending,
    error: deleteDocumentMutation.error,
  };
}
