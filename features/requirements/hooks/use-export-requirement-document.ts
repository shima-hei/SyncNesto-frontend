"use client";

import { toast } from "sonner";

import type {
  RequirementDocumentExportCreate,
  RequirementDocumentExportRead,
} from "@/lib/api/generated/model";
import { useExportRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdExportsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";

export function useExportRequirementDocument(
  projectId: number,
  documentId: number,
) {
  const exportMutation =
    useExportRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdExportsPost(
      {
        mutation: {
          onSuccess: () => {
            toast.success(REQUIREMENT_MESSAGES.export.success);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.export.error);
          },
        },
      },
    );

  const exportRequirementDocument = async (
    values: RequirementDocumentExportCreate,
    options: { download: boolean },
  ) => {
    const data = await exportMutation.mutateAsync({
      projectId,
      documentId,
      data: values,
    });

    if (options.download) {
      downloadExportedDocument(documentId, data);
    }

    return data;
  };

  return {
    exportRequirementDocument,
    isPending: exportMutation.isPending,
  };
}

const downloadExportedDocument = (
  documentId: number,
  data: RequirementDocumentExportRead,
) => {
  const extension =
    data.format === "pdf" ? "pdf" : data.format === "html" ? "html" : "md";
  const blob =
    data.format === "pdf"
      ? buildPdfBlob(data.content)
      : new Blob([data.content], {
          type: data.format === "html" ? "text/html" : "text/markdown",
        });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `requirement-document-${documentId}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
};

const buildPdfBlob = (base64Content: string) => {
  const binary = window.atob(base64Content);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new Blob([bytes], { type: "application/pdf" });
};
