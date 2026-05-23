"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementDocumentCreate } from "@/lib/api/generated/model";
import {
  getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey,
  useCreateRequirementDocumentProjectsProjectIdRequirementDocumentsPost,
} from "@/lib/api/generated/requirements/requirements";

import { toOptionalNumber } from "../constants/requirement-form";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

export function useCreateRequirementDocument(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createDocumentMutation =
    useCreateRequirementDocumentProjectsProjectIdRequirementDocumentsPost({
      mutation: {
        onSuccess: async (document) => {
          await queryClient.invalidateQueries({
            queryKey:
              getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey(
                projectId
              ),
          });
          toast.success("要件定義書を登録しました。");
          router.push(`/projects/joined/${projectId}/requirements/${document.id}`);
        },
        onError: () => {
          toast.error("要件定義書の登録に失敗しました。");
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

const toRequirementDocumentCreate = (
  values: RequirementDocumentFormValues
): RequirementDocumentCreate => {
  return {
    title: values.title,
    document_code: values.documentCode,
    status: values.status,
    purpose: values.purpose || null,
    target_system_name: values.targetSystemName || null,
    client_name: values.clientName || null,
    vendor_name: values.vendorName || null,
    author_id: toOptionalNumber(values.authorId),
    reviewer_id: toOptionalNumber(values.reviewerId),
    approver_id: toOptionalNumber(values.approverId),
    approved_at: values.approvedAt || null,
  };
};
