import type { QueryClient } from "@tanstack/react-query";

import type {
  RequirementDocumentRead,
  RequirementRead,
} from "@/lib/api/generated/model";
import {
  getListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGetQueryKey as getRequirementCommentListKey,
  getListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetQueryKey as getRequirementDocumentListKey,
  getListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGetQueryKey as getRequirementLinkListKey,
  getListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGetQueryKey as getRequirementReviewListKey,
  getListRequirementsProjectsProjectIdRequirementsGetQueryKey as getRequirementListKey,
  getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey as getRequirementDocumentDetailKey,
  getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryKey as getRequirementDetailKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey as getRequirementSummaryKey,
} from "@/lib/api/generated/requirements/requirements";

export const invalidateRequirementList = (
  queryClient: QueryClient,
  projectId: number
) => {
  return queryClient.invalidateQueries({
    queryKey: getRequirementListKey(projectId),
  });
};

export const invalidateRequirementDocumentList = (
  queryClient: QueryClient,
  projectId: number
) => {
  return queryClient.invalidateQueries({
    queryKey: getRequirementDocumentListKey(projectId),
  });
};

export const invalidateRequirementSummary = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number
) => {
  return queryClient.invalidateQueries({
    queryKey: getRequirementSummaryKey(projectId, requirementId),
  });
};

export const invalidateRequirementCommentsWithSummary = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number
) => {
  // コメント件数は要件詳細summaryにも表示するため、一覧とsummaryを同時に更新する。
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getRequirementCommentListKey(projectId, requirementId),
    }),
    invalidateRequirementSummary(queryClient, projectId, requirementId),
  ]);
};

export const invalidateRequirementLinksWithSummary = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number
) => {
  // 関連成果物件数は要件詳細summaryにも表示するため、一覧とsummaryを同時に更新する。
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getRequirementLinkListKey(projectId, requirementId),
    }),
    invalidateRequirementSummary(queryClient, projectId, requirementId),
  ]);
};

export const invalidateRequirementReviewsWithSummary = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number
) => {
  // レビュー情報は要件詳細summaryにも表示するため、一覧とsummaryを同時に更新する。
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getRequirementReviewListKey(projectId, requirementId),
    }),
    invalidateRequirementSummary(queryClient, projectId, requirementId),
  ]);
};

export const setRequirementDetailCache = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number,
  requirement: RequirementRead
) => {
  queryClient.setQueryData(
    getRequirementDetailKey(projectId, requirementId),
    requirement
  );
};

export const removeRequirementDetailCache = (
  queryClient: QueryClient,
  projectId: number,
  requirementId: number
) => {
  queryClient.removeQueries({
    queryKey: getRequirementDetailKey(projectId, requirementId),
  });
  queryClient.removeQueries({
    queryKey: getRequirementSummaryKey(projectId, requirementId),
  });
};

export const setRequirementDocumentDetailCache = (
  queryClient: QueryClient,
  projectId: number,
  documentId: number,
  document: RequirementDocumentRead
) => {
  queryClient.setQueryData(
    getRequirementDocumentDetailKey(projectId, documentId),
    document
  );
};

export const removeRequirementDocumentDetailCache = (
  queryClient: QueryClient,
  projectId: number,
  documentId: number
) => {
  queryClient.removeQueries({
    queryKey: getRequirementDocumentDetailKey(projectId, documentId),
  });
};
