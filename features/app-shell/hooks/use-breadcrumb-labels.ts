"use client";

import { useQueries, type UseQueryOptions } from "@tanstack/react-query";

import { documentKeys } from "@/features/documents/lib/document";
import { specificationKeys } from "@/features/specifications/lib/specification";
import { readDocumentProjectsProjectIdDocumentsDocumentIdGet as readDocument } from "@/lib/api/generated/documents/documents";
import { getReadProjectProjectsProjectIdGetQueryOptions as projectQuery } from "@/lib/api/generated/projects/projects";
import {
  getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryOptions as requirementDocumentQuery,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryOptions as requirementQuery,
} from "@/lib/api/generated/requirements/requirements";
import { readSpecificationProjectsProjectIdSpecificationsSpecificationIdGet as readSpecification } from "@/lib/api/generated/specifications/specifications";
import { getReadTaskTasksTaskIdGetQueryOptions as taskQuery } from "@/lib/api/generated/tasks/tasks";
import { readTestDesignProjectsProjectIdTestDesignsDesignIdGet as readTestDesign } from "@/lib/api/generated/test-designs/test-designs";

import {
  getProjectIdFromBreadcrumbItems,
  type BreadcrumbItem,
} from "../utils/breadcrumbs";

type NamedResource = {
  title?: string;
  name?: string;
  project_id?: number;
  requirement?: { title: string; document_id: number };
};

type NameQuery = Pick<UseQueryOptions<NamedResource>, "queryKey" | "queryFn">;

export function useBreadcrumbLabels(items: BreadcrumbItem[]) {
  const projectId = getProjectIdFromBreadcrumbItems(items);
  const documentId = items.find(
    (item) => item.dynamicType === "requirement-document",
  )?.dynamicId;
  const entries = items.flatMap((item, index) => {
    const query = getNameQuery(item, projectId);
    return query ? [{ index, query }] : [];
  });
  const results = useQueries({
    queries: entries.map(({ query }) => ({ ...query, retry: false })),
  });
  const labels = items.map((item) => item.label);

  for (const [position, result] of results.entries()) {
    const record = result.isSuccess ? result.data : undefined;
    if (
      !record ||
      (record.project_id != null && record.project_id !== projectId)
    ) {
      continue;
    }
    const label = record.requirement
      ? record.requirement.document_id === documentId
        ? record.requirement.title
        : undefined
      : (record.title ?? record.name);
    if (label?.trim()) labels[entries[position].index] = label;
  }
  return labels;
}

function getNameQuery(
  item: BreadcrumbItem,
  projectId: number | null,
): NameQuery | null {
  const id = item.dynamicId;
  if (
    !projectId ||
    !id ||
    !Number.isSafeInteger(projectId) ||
    !Number.isSafeInteger(id)
  ) {
    return null;
  }

  switch (item.dynamicType) {
    case "project":
      return projectQuery(id);
    case "task":
      return taskQuery(id);
    case "requirement-document":
      return requirementDocumentQuery(projectId, id);
    case "requirement":
      return requirementQuery(projectId, id);
    case "document":
      return {
        queryKey: documentKeys.detail(projectId, id),
        queryFn: ({ signal }) => readDocument(projectId, id, { signal }),
      };
    case "specification":
      return {
        queryKey: specificationKeys.detail(projectId, id),
        queryFn: ({ signal }) => readSpecification(projectId, id, { signal }),
      };
    case "test-design":
      return {
        queryKey: ["test-design", projectId, id],
        queryFn: ({ signal }) => readTestDesign(projectId, id, { signal }),
      };
    default:
      return null;
  }
}
