"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  RequirementDocumentRead,
  RequirementDocumentUpdate,
} from "@/lib/api/generated/model";
import {
  getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey,
  getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey,
  useUpdateRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdPatch,
} from "@/lib/api/generated/requirements/requirements";

import { toOptionalNumber } from "../constants/requirement-form";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

export function useUpdateRequirementDocument(
  projectId: number,
  documentId: number
) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<RequirementDocumentRead | null>(null);
  const updateDocumentMutation =
    useUpdateRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdPatch(
      {
        mutation: {
          onSuccess: async (document) => {
            setConflictCurrent(null);
            queryClient.setQueryData(
              getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey(
                projectId,
                documentId
              ),
              document
            );
            await queryClient.invalidateQueries({
              queryKey:
                getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey(
                  projectId
                ),
            });
            toast.success("要件定義書を更新しました。");
          },
          onError: (error) => {
            const current = getConflictCurrent<RequirementDocumentRead>(error);

            if (current) {
              setConflictCurrent(current);
              toast.error("他の更新と競合しました。");
              return;
            }

            toast.error("要件定義書の更新に失敗しました。");
          },
        },
      }
    );

  const updateRequirementDocument = async (
    values: RequirementDocumentFormValues,
    version: number
  ) => {
    return updateDocumentMutation.mutateAsync({
      projectId,
      documentId,
      data: toRequirementDocumentUpdate(values, version),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateRequirementDocument,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateDocumentMutation.isPending,
    error: updateDocumentMutation.error,
  };
}

const toRequirementDocumentUpdate = (
  values: RequirementDocumentFormValues,
  version: number
): RequirementDocumentUpdate => {
  return {
    version,
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
