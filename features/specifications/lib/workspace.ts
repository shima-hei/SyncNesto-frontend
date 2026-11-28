export {
  designScreenListProjectsProjectIdDesignWorkspaceScreenListGet as readScreenList,
  designScreenListMembersProjectsProjectIdDesignWorkspaceScreenListMembersGet as readScreenListMembers,
  editDesignScreenListProjectsProjectIdDesignWorkspaceScreenListEditsPost as saveScreenListEdits,
  designReviewRequestsProjectsProjectIdDesignWorkspaceReviewRequestsGet as listDesignReviewRequests,
  designReviewCandidatesProjectsProjectIdDesignWorkspaceReviewRequestsCandidatesGet as listDesignReviewCandidates,
  createDesignReviewRequestProjectsProjectIdDesignWorkspaceReviewRequestsPost as createDesignReviewRequest,
  decideDesignReviewRequestProjectsProjectIdDesignWorkspaceReviewRequestsRequestIdDecisionPost as decideDesignReviewRequest,
  designOverviewProjectsProjectIdDesignWorkspaceOverviewGet as readDesignOverview,
  designCollectionsProjectsProjectIdDesignWorkspaceCollectionsGet as readDesignCollections,
  createDesignCollectionProjectsProjectIdDesignWorkspaceCollectionsPost as createDesignCollection,
  updateDesignCollectionProjectsProjectIdDesignWorkspaceCollectionsCollectionIdPatch as updateDesignCollection,
  updateDesignMembershipsProjectsProjectIdDesignWorkspaceMembershipsSpecificationIdPut as updateMemberships,
  designDiagramProjectsProjectIdDesignWorkspaceDiagramGet as readDesignDiagram,
  updateDesignPlacementsProjectsProjectIdDesignWorkspacePlacementsPut as savePlacements,
  previewDesignMockupProjectsProjectIdDesignWorkspaceMockupPreviewPost as previewMockup,
  designWireframePartsProjectsProjectIdDesignWorkspaceWireframePartsGet as listWireframeParts,
  readDesignWireframePartProjectsProjectIdDesignWorkspaceWireframePartsPartIdGet as readWireframePart,
  createDesignWireframePartProjectsProjectIdDesignWorkspaceWireframePartsPost as createWireframePart,
  updateDesignWireframePartProjectsProjectIdDesignWorkspaceWireframePartsPartIdPatch as updateWireframePart,
  importDesignOpenapiProjectsProjectIdDesignWorkspaceOpenapiImportPost as importOpenApi,
  exportDesignOpenapiProjectsProjectIdDesignWorkspaceOpenapiGet as exportOpenApi,
  exportDesignDdlProjectsProjectIdDesignWorkspaceDdlGet as exportDdl,
  readDesignImpactProjectsProjectIdDesignWorkspaceImpactSpecificationIdGet as readDesignImpact,
  updateDesignImpactProjectsProjectIdDesignWorkspaceImpactSpecificationIdPut as updateDesignImpact,
} from "@/lib/api/generated/design-workspace/design-workspace";

export const designKey = (projectId: number) =>
  ["design-workspace", projectId] as const;
export const screenKinds = {
  list: "一覧",
  detail: "詳細",
  create: "登録",
  edit: "編集",
  dashboard: "ダッシュボード",
  modal: "モーダル",
  drawer: "ドロワー",
  layout: "共通レイアウト",
  other: "その他",
} as const;

export function downloadDesign(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/octet-stream" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
