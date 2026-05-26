"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  RequirementDocumentRead,
} from "@/lib/api/generated/model";
import { useUpdateRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementDocumentList,
  setRequirementDocumentDetailCache,
} from "../lib/requirement-cache";
import { toRequirementDocumentUpdate } from "../lib/requirement-mappers";
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
            setRequirementDocumentDetailCache(
              queryClient,
              projectId,
              documentId,
              document
            );
            await invalidateRequirementDocumentList(queryClient, projectId);
            toast.success(REQUIREMENT_MESSAGES.document.updateSuccess);
          },
          onError: (error) => {
            const current = getConflictCurrent<RequirementDocumentRead>(error);

            if (current) {
              setConflictCurrent(current);
              toast.error(REQUIREMENT_MESSAGES.conflict);
              return;
            }

            toast.error(REQUIREMENT_MESSAGES.document.updateError);
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
