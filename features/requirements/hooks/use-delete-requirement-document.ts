"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey,
  getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey,
  useDeleteRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdDelete,
} from "@/lib/api/generated/requirements/requirements";

export function useDeleteRequirementDocument(
  projectId: number,
  documentId: number
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteDocumentMutation =
    useDeleteRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            queryClient.removeQueries({
              queryKey:
                getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey(
                  projectId,
                  documentId
                ),
            });
            await queryClient.invalidateQueries({
              queryKey:
                getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey(
                  projectId
                ),
            });
            toast.success("要件定義書を削除しました。");
            router.push(`/projects/joined/${projectId}/requirements`);
          },
          onError: () => {
            toast.error("要件定義書の削除に失敗しました。");
          },
        },
      }
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
