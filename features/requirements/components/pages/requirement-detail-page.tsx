"use client";
import { LinkedText } from "@/components/shared/smart-links/linked-text";
import { selectedTextForLinkSource } from "@/lib/smart-links/quote";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { VerificationEntry } from "@/features/requirement-verifications/components/verification-entry";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  RelatedSpecifications,
  useRelatedSpecifications,
} from "@/features/specifications/components/related-specifications";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CopyIcon,
  EditIcon,
  EllipsisIcon,
  MessageSquarePlusIcon,
  Trash2Icon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { artifactReleasesHref } from "@/features/artifact-releases/lib/navigation";
import { ActivityPanel } from "@/components/shared/detail/activity-panel";
import { UserDisplay } from "@/components/shared/display/user-avatar";
import { StatusIndicator } from "@/components/shared/display/status-badge";
import { RequirementPriorityBadge } from "../shared/requirement-badges";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskProgress } from "@/features/tasks/hooks/use-task-progress";
import { RequirementRelatedTasksSection } from "@/features/tasks/components/sections/requirement-related-tasks-section";
import {
  canCreateTask,
  canCreateRequirement,
  canDeleteRequirement,
  canCommentRequirement,
  canLinkRequirement,
  canReviewRequirement,
  canUpdateRequirement,
} from "@/features/auth/utils/authorization";
import { scrollToRequirementContent } from "@/features/requirements/lib/scroll-to-requirement-content";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useRequirementVerdicts } from "@/features/projects/hooks/use-requirement-verdicts";
import { RequirementVerdict } from "@/features/projects/components/joined/requirement-verdict";
import { useAuth } from "@/features/auth/providers/auth-provider";

import {
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../constants/requirement-options";
import { useDeleteRequirement } from "../../hooks/use-delete-requirement";
import { useRequirementDocument } from "../../hooks/use-requirement-document";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useRequirementSummary } from "../../hooks/use-requirement-summary";
import { useTargetComments } from "../../hooks/use-target-comments";
import {
  createRequirementFieldCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import {
  evaluateRequirementReviewAnchor,
  isRequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";
import { RequirementApprovalsSection } from "../sections/requirement-approvals-section";
import { RequirementItemActivity } from "../sections/requirement-item-activity";
import { RequirementDetailsSection } from "../sections/requirement-details-section";
import { RequirementLinksSection } from "../sections/requirement-links-section";
import { RequirementRelationsSection } from "../sections/requirement-relations-section";
import { RequirementReviewsSection } from "../sections/requirement-reviews-section";
import { RequirementRevisionsSection } from "../sections/requirement-revisions-section";
import { RequirementTargetCommentsSection } from "../sections/requirement-target-comments-section";
import {
  RequirementTestItemsSection,
  useRequirementTestItems,
} from "../sections/requirement-test-items-section";
import { RequirementInlineEditor } from "../forms/requirement-inline-editor";
import { RequirementItemReviewPanel } from "../review/requirement-item-review-panel";
import { RequirementReviewRequestDialog } from "../forms/requirement-review-request-dialog";
import { requirementPublicationHref } from "@/features/artifact-publications/lib/requirement-publication-navigation";
import { RequirementItemWorkflow } from "../review/requirement-item-workflow";
import { useRequirementItemWorkflow } from "../../hooks/use-requirement-item-workflow";
import { useRequirementReviewRequest } from "../../hooks/use-requirement-review-request";
import { useRequirementReviewManagement } from "../../hooks/use-requirement-review-management";
import { requirementWorkflowHref } from "../../lib/requirement-workflow-review";

const REQUIREMENT_DETAIL_TABS = [
  "overview",
  "details",
  "relations",
  "reviews",
  "verification",
  "approvals",
  "history",
] as const;

type RequirementDetailPageProps = {
  projectId: number;
  documentId: number;
  requirementId: number;
};

type RequirementReviewFieldAnchor = {
  field: string;
  quote?: string;
  start_offset?: number;
  end_offset?: number;
};

export function RequirementDetailPage({
  projectId,
  documentId,
  requirementId,
}: RequirementDetailPageProps) {
  const { returnTo, withReturn } = useListNavigation(
    `/projects/joined/${projectId}/requirements/${documentId}?tab=requirements`,
  );
  const [requestedTab, setActiveTab] = useUrlTabState({
    values: REQUIREMENT_DETAIL_TABS,
    defaultValue: "overview",
  });
  const legacyHistory =
    requestedTab === "approvals" || requestedTab === "history";
  const activeTab =
    legacyHistory || requestedTab === "details" ? "overview" : requestedTab;
  const [activity, setActivity] = useState("history");
  const [editRequested, setEditRequested] = useUrlFilterState("edit", "");
  const [editingFromHeader, setEditing] = useState(false);
  const editing = editingFromHeader || editRequested === "1";
  const endEdit = () => {
    setEditRequested("");
    setEditing(false);
  };
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useState<RequirementCommentAnchor | null>(null);

  const [relatedCommentTarget, setRelatedCommentTarget] = useState<
    string | null
  >(null);
  useEffect(() => {
    if (activeTab !== "relations" || !relatedCommentTarget) return;
    const panel = document.getElementById("requirement-related-items");
    if (!panel) return;
    const jump = () => {
      const element = panel.querySelector(relatedCommentTarget);
      if (!element) return false;
      const group = element.closest("details");
      if (group) group.open = true;
      scrollToRequirementContent(element);
      setRelatedCommentTarget(null);
      return true;
    };
    if (jump()) return;
    const observer = new MutationObserver(() => {
      if (jump()) observer.disconnect();
    });
    observer.observe(panel, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeTab, relatedCommentTarget]);

  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { user } = useAuth();
  const { sections } = useRequirementSections(projectId, documentId);
  const { summary, isLoading, error } = useRequirementSummary(
    projectId,
    requirementId,
  );
  const workflow = useRequirementItemWorkflow(
    projectId,
    summary ? [summary.requirement] : [],
  );
  const reviewRequest = useRequirementReviewRequest(
    projectId,
    workflow.data?.[0]?.review_request_id,
  );
  const documentReview = useRequirementReviewManagement(projectId, documentId, {
    enabled: Boolean(summary && user?.user_type === "internal" && !user.demo),
  });
  const verdicts = useRequirementVerdicts(projectId, [requirementId]);
  const { comments: targetComments } = useTargetComments(
    projectId,
    "requirement_item",
    requirementId,
  );
  const { deleteRequirement, isPending: isDeletePending } =
    useDeleteRequirement(projectId, documentId, requirementId);

  if (isLoading) {
    return <RequirementDetailSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className="text-sm text-muted-foreground">
        要件を取得できませんでした。
      </div>
    );
  }

  const { requirement } = summary;
  const activeReview =
    reviewRequest.data?.status === "requested" ||
    reviewRequest.data?.status === "changes_requested"
      ? reviewRequest.data
      : null;
  const approvedChanges = workflow.data?.[0]?.changed_fields ?? [];
  const designImpact = approvedChanges.some(
    (field) => field !== "requirement_code",
  );
  const testImpact = approvedChanges.some((field) =>
    [
      "description",
      "acceptance_criteria",
      "requirement_type",
      "details",
    ].includes(field),
  );
  const section = sections.find((item) => item.id === requirement.section_id);
  const canDuplicate = canCreateRequirement(currentProjectRole);
  const canDelete = canDeleteRequirement(currentProjectRole);
  const canUpdate = canUpdateRequirement(currentProjectRole);
  const canSaveVersion =
    user?.user_type === "internal" &&
    !user.demo &&
    canReviewRequirement(currentProjectRole);
  const itemPath = `/projects/joined/${projectId}/requirements/${documentId}/items/${requirementId}`;
  const chooseCommentAnchor = (target: RequirementCommentAnchor) => {
    setSelectedTargetAnchor(target);
    setActivity("comments");
    setActiveTab("overview");
    requestAnimationFrame(() =>
      document
        .getElementById("requirement-activity")
        ?.scrollIntoView({ block: "nearest" }),
    );
  };

  const fieldTargetAnchors = targetComments
    .map((comment) => comment.target_anchor)
    .filter(isRequirementReviewFieldAnchor);

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    const anchorKey = getRequirementCommentAnchorKey(targetAnchor);
    const selector = anchorKey
      ? `[data-requirement-comment-anchor="${CSS.escape(anchorKey)}"]`
      : isRequirementReviewFieldAnchor(targetAnchor)
        ? `[data-requirement-anchor-field="${CSS.escape(targetAnchor.field)}"]`
        : null;

    if (!selector) {
      return;
    }

    if (
      targetAnchor.kind === "requirement_task" ||
      targetAnchor.kind === "requirement_link" ||
      targetAnchor.kind === "requirement_relation"
    ) {
      setRelatedCommentTarget(selector);
      setActiveTab("relations");
      return;
    }
    const element = document.querySelector(selector);
    scrollToRequirementContent(element);
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return null;
    }

    return evaluateRequirementReviewAnchor(
      targetAnchor,
      getRequirementAnchorFieldValue(requirement, targetAnchor.field),
      requirement.version,
    );
  };

  return (
    <div className="@container/requirement-detail flex min-w-0 flex-col gap-6">
      <OverviewReturn projectId={projectId} />
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={returnTo}>
          <ArrowLeftIcon data-icon="inline-start" />
          要件一覧へ戻る
        </Link>
      </Button>
      <div
        id="requirement-field-title"
        data-requirement-anchor-field="title"
        className="scroll-mt-24"
      >
        <PageHeader
          title={requirement.title}
          metadata={
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {requirement.requirement_code}
              </span>
              <RequirementPriorityBadge priority={requirement.priority} />
              {activeReview ? (
                <StatusIndicator
                  tone={
                    activeReview.status === "requested" ? "info" : "warning"
                  }
                >
                  {activeReview.status === "requested"
                    ? "レビュー中"
                    : "要修正"}
                </StatusIndicator>
              ) : null}
            </div>
          }
          actions={
            <>
              {activeReview ? (
                <Button asChild>
                  <Link
                    href={requirementWorkflowHref(projectId, activeReview.id)}
                  >
                    レビューを確認
                  </Link>
                </Button>
              ) : user?.user_type === "internal" &&
                !user.demo &&
                requirement.document_id === documentId &&
                canReviewRequirement(currentProjectRole) &&
                canUpdateRequirement(currentProjectRole) ? (
                <RequestItemReview
                  projectId={projectId}
                  documentId={documentId}
                  item={{
                    id: requirementId,
                    title: requirement.title,
                    code: requirement.requirement_code,
                  }}
                />
              ) : null}
              {canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveTab("overview");
                    setEditing(true);
                  }}
                >
                  <EditIcon data-icon="inline-start" />
                  編集
                </Button>
              ) : null}
              {canDuplicate || canDelete || canSaveVersion ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="要件の操作"
                    >
                      <EllipsisIcon aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canSaveVersion ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href={artifactReleasesHref(
                            projectId,
                            "requirement",
                            requirementId,
                            requirement.version,
                            withReturn(itemPath),
                          )}
                        >
                          <ArchiveIcon aria-hidden /> バージョン履歴・添付資料
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canDuplicate ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/projects/joined/${projectId}/requirements/${documentId}/items/new?duplicateFrom=${requirementId}`}
                        >
                          <CopyIcon aria-hidden /> 複製
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2Icon aria-hidden /> 削除
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </>
          }
        />
      </div>

      <div className="grid min-w-0 gap-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          activationMode="manual"
          className="min-w-0 gap-4"
        >
          <TabsList
            variant="line"
            aria-label="要件詳細の表示内容"
            className="w-full justify-start overflow-x-auto border-b"
          >
            <TabsTrigger className="flex-none px-4 py-2" value="overview">
              概要
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="relations">
              関連成果物
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="reviews">
              レビュー
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 py-2" value="verification">
              検証
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            forceMount
            hidden={activeTab !== "overview"}
          >
            <div className="grid min-w-0 items-start gap-5 @min-[48rem]/requirement-detail:grid-cols-[minmax(0,1fr)_16rem] @min-[64rem]/requirement-detail:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="grid min-w-0 content-start gap-4">
                {editing && canUpdate ? (
                  <section
                    aria-label="要件を編集"
                    className="grid gap-3 border-b pb-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">要件を編集</h2>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={endEdit}
                      >
                        編集を閉じる
                      </Button>
                    </div>
                    <RequirementInlineEditor
                      projectId={projectId}
                      documentId={documentId}
                      requirement={requirement}
                      onSaved={endEdit}
                    />
                  </section>
                ) : (
                  <section
                    aria-label="要件の内容"
                    className="grid min-w-0 gap-3"
                  >
                    <RequirementInfo
                      label="要件の内容"
                      value={requirement.description ?? "未入力"}
                      field="description"
                      targetAnchors={fieldTargetAnchors}
                      onSelectTargetAnchor={
                        canCommentRequirement(currentProjectRole)
                          ? chooseCommentAnchor
                          : undefined
                      }
                    />
                    <RequirementInfo
                      label="受け入れ条件"
                      value={requirement.acceptance_criteria ?? "未入力"}
                      field="acceptance_criteria"
                      targetAnchors={fieldTargetAnchors}
                      onSelectTargetAnchor={
                        canCommentRequirement(currentProjectRole)
                          ? chooseCommentAnchor
                          : undefined
                      }
                    />
                    <details
                      className="text-sm"
                      open={
                        Boolean(requirement.rationale || requirement.source) ||
                        undefined
                      }
                    >
                      <summary className="cursor-pointer text-muted-foreground">
                        背景・理由・情報源
                      </summary>
                      <div className="grid gap-2 pt-2">
                        <RequirementInfo
                          label="背景・理由"
                          value={requirement.rationale ?? "未入力"}
                          field="rationale"
                          targetAnchors={fieldTargetAnchors}
                          onSelectTargetAnchor={
                            canCommentRequirement(currentProjectRole)
                              ? chooseCommentAnchor
                              : undefined
                          }
                        />
                        <RequirementInfo
                          label="情報源"
                          value={requirement.source ?? "未入力"}
                          field="source"
                          targetAnchors={fieldTargetAnchors}
                          onSelectTargetAnchor={
                            canCommentRequirement(currentProjectRole)
                              ? chooseCommentAnchor
                              : undefined
                          }
                        />
                      </div>
                    </details>
                  </section>
                )}
                <RequirementDetailsSection
                  projectId={projectId}
                  requirementId={requirementId}
                  details={summary.details}
                  canUpdate={canUpdate}
                  onSelectCommentAnchor={
                    canCommentRequirement(currentProjectRole)
                      ? chooseCommentAnchor
                      : undefined
                  }
                />
                <div id="requirement-activity" className="scroll-mt-24">
                  <ActivityPanel
                    activationMode="manual"
                    value={activity}
                    onValueChange={setActivity}
                    historyLabel="タイムライン"
                    comments={
                      <RequirementTargetCommentsSection
                        projectId={projectId}
                        targetType="requirement_item"
                        targetId={requirementId}
                        canComment={canCommentRequirement(currentProjectRole)}
                        selectedTargetAnchor={selectedTargetAnchor}
                        onTargetAnchorClick={handleTargetAnchorClick}
                        getTargetAnchorStatus={getTargetAnchorStatus}
                        showTargetAnchorInput={false}
                        embedded
                      />
                    }
                    history={
                      <>
                        <RequirementItemActivity
                          key={requirementId}
                          projectId={projectId}
                          documentId={documentId}
                          requirementId={requirementId}
                        />
                        <details className="mt-4 border-t pt-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            従来のレビュー・承認と改訂記録
                          </summary>
                          <div className="grid gap-3 pt-3">
                            <RequirementReviewsSection
                              projectId={projectId}
                              requirementId={requirementId}
                            />
                            <RequirementApprovalsSection
                              projectId={projectId}
                              targetType="requirement_item"
                              targetId={requirementId}
                              title="従来の承認記録"
                              canReview={false}
                            />
                            <RequirementRevisionsSection
                              projectId={projectId}
                              requirementId={requirementId}
                            />
                          </div>
                        </details>
                      </>
                    }
                  />
                </div>
              </div>
              <aside
                aria-label="要件の属性"
                className="grid min-w-0 content-start gap-2 border-t pt-3 @min-[48rem]/requirement-detail:border-s @min-[48rem]/requirement-detail:border-t-0 @min-[48rem]/requirement-detail:ps-4 @min-[48rem]/requirement-detail:pt-0"
              >
                <h2 className="text-sm font-semibold">属性</h2>
                <RequirementInfo
                  label="種別"
                  value={getRequirementTypeLabel(requirement.requirement_type)}
                  field="requirement_type"
                  inline
                />
                <RequirementInfo
                  label="優先度"
                  value={getRequirementPriorityLabel(requirement.priority)}
                  displayValue={
                    <RequirementPriorityBadge priority={requirement.priority} />
                  }
                  field="priority"
                  inline
                />
                <RequirementInfo
                  label="担当者"
                  value={requirement.owner?.name ?? "未割り当て"}
                  displayValue={
                    <UserDisplay
                      name={requirement.owner?.name}
                      src={requirement.owner?.avatar_url}
                    />
                  }
                  inline
                />
                <RequirementInfo
                  label="カテゴリ"
                  value={requirement.category ?? "未設定"}
                  field="category"
                  inline
                />
                <RequirementInfo
                  label="章"
                  value={section?.title ?? "未分類"}
                  inline
                />
                <RequirementItemWorkflow
                  projectId={projectId}
                  requirement={requirement}
                  returnTo={returnTo}
                  query={workflow}
                  verdicts={verdicts}
                  approvalStatus={documentReview.data?.formal_approval?.status}
                />
                <RequirementRelatedSummary
                  projectId={projectId}
                  requirementId={requirementId}
                  onOpen={(target) => {
                    setRelatedCommentTarget(`[data-related-group="${target}"]`);
                    setActiveTab("relations");
                  }}
                />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="relations">
            <div id="requirement-related-items" className="grid">
              <h2 className="mb-3 text-base font-semibold">関連成果物</h2>
              <div data-related-group="design" className="min-w-0 scroll-mt-24">
                <RelatedSpecifications
                  grouped
                  projectId={projectId}
                  targetType="requirement"
                  targetId={String(requirementId)}
                  needsImpactReview={designImpact}
                />
              </div>
              <div data-related-group="tasks" className="min-w-0 scroll-mt-24">
                <RequirementRelatedTasksSection
                  projectId={projectId}
                  requirementId={requirementId}
                  canCreate={canCreateTask(currentProjectRole)}
                  onSelectCommentAnchor={
                    canCommentRequirement(currentProjectRole)
                      ? chooseCommentAnchor
                      : undefined
                  }
                />
              </div>
              <div data-related-group="tests" className="min-w-0 scroll-mt-24">
                <RequirementTestItemsSection
                  projectId={projectId}
                  requirementId={requirementId}
                  needsImpactReview={testImpact}
                />
              </div>
              <RequirementLinksSection
                projectId={projectId}
                requirementId={requirementId}
                canLink={canLinkRequirement(currentProjectRole)}
                onSelectCommentAnchor={
                  canCommentRequirement(currentProjectRole)
                    ? chooseCommentAnchor
                    : undefined
                }
              />
              <RequirementRelationsSection
                projectId={projectId}
                documentId={documentId}
                currentSectionId={requirement.section_id}
                requirementId={requirementId}
                canLink={canLinkRequirement(currentProjectRole)}
                onSelectCommentAnchor={
                  canCommentRequirement(currentProjectRole)
                    ? chooseCommentAnchor
                    : undefined
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <RequirementItemReviewPanel
              projectId={projectId}
              documentId={documentId}
              requirementId={requirementId}
              workflow={workflow}
            />
          </TabsContent>
          <TabsContent value="verification">
            <section aria-label="要件の検証" className="grid gap-4">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold">要件の検証</h2>
                <RequirementVerdict
                  query={verdicts}
                  requirementId={requirementId}
                  version={requirement.version}
                  projectId={projectId}
                  returnTo={withReturn(`${itemPath}?tab=verification`)}
                />
              </header>
              <VerificationEntry
                projectId={projectId}
                requirementId={requirementId}
                version={requirement.version}
                embedded
              />
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="要件"
        description="関連する実現内容、コメント、レビューも利用できなくなります。保持期限内はごみ箱から復元できます。"
        isPending={isDeletePending}
        onConfirm={deleteRequirement}
      />
    </div>
  );
}

function RequestItemReview({
  projectId,
  documentId,
  item,
}: {
  projectId: number;
  documentId: number;
  item: { id: number; title: string; code: string };
}) {
  const { document, isLoading } = useRequirementDocument(projectId, documentId);
  const router = useRouter();

  if (!document) return null;
  return (
    <RequirementReviewRequestDialog
      projectId={projectId}
      documentId={documentId}
      documentVersion={document.version}
      disabled={isLoading}
      targetRequirement={item}
      externalHref={requirementPublicationHref(
        projectId,
        documentId,
        document.version,
        item,
      )}
      onRequested={(requestId) =>
        router.push(
          `/projects/joined/${projectId}/requirement-workflow/${requestId}`,
        )
      }
    />
  );
}

function RequirementRelatedSummary({
  projectId,
  requirementId,
  onOpen,
}: {
  projectId: number;
  requirementId: number;
  onOpen: (target: string) => void;
}) {
  const { query: designs, canRead } = useRelatedSpecifications(
    projectId,
    "requirement",
    String(requirementId),
  );
  const tasks = useTaskProgress(requirementId);
  const tests = useRequirementTestItems(projectId, requirementId);
  const counts = [
    {
      label: "画面・API設計",
      target: "design",
      count: canRead ? designs.data?.length : undefined,
    },
    { label: "タスク", target: "tasks", count: tasks.progress?.task_count },
    {
      label: "テスト項目",
      target: "tests",
      count: tests.data?.filter((item) => !item.item_deleted).length,
    },
  ];

  return (
    <section className="grid gap-1 border-t pt-3" aria-label="関連情報">
      <h2 className="text-sm font-semibold">関連情報</h2>
      <dl className="grid gap-1 text-sm">
        {counts.map(({ label, target, count }) => (
          <div
            key={label}
            className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-2"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd>
              {count === undefined ? (
                "—"
              ) : (
                <button
                  type="button"
                  className="rounded-sm text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => onOpen(target)}
                  aria-label={`${label} ${count}件を開く`}
                >
                  {count}件
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RequirementInfo({
  label,
  value,
  displayValue,
  field,
  targetAnchors = [],
  onSelectTargetAnchor,
  inline = false,
}: {
  label: string;
  value: string;
  displayValue?: ReactNode;
  inline?: boolean;
  field?: string;
  targetAnchors?: RequirementReviewFieldAnchor[];
  onSelectTargetAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const fieldAnchors = field
    ? targetAnchors.filter((targetAnchor) => targetAnchor.field === field)
    : [];
  const anchorKey = field
    ? getRequirementCommentAnchorKey(
        createRequirementFieldCommentAnchor(field, label),
      )
    : null;

  return (
    <div
      className={
        inline
          ? "grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-2 scroll-mt-24"
          : "group grid gap-1 scroll-mt-24"
      }
      data-requirement-anchor-field={field}
      id={field ? `requirement-field-${field}` : undefined}
      data-requirement-comment-anchor={anchorKey ?? undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {field && onSelectTargetAnchor ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
            onMouseDown={(event) => {
              if (window.getSelection()?.isCollapsed === false)
                event.preventDefault();
            }}
            onClick={() => {
              const quote = selectedTextForLinkSource(valueRef.current, value);
              onSelectTargetAnchor(
                createRequirementFieldCommentAnchor(field, label, quote),
              );
            }}
          >
            <MessageSquarePlusIcon data-icon="inline-start" />
            コメント
          </Button>
        ) : null}
      </div>
      <span ref={valueRef} className="whitespace-pre-wrap break-words text-sm">
        {displayValue ?? (
          <LinkedText
            text={value}
            renderText={(text) => renderHighlightedValue(text, fieldAnchors)}
          />
        )}
      </span>
    </div>
  );
}

function RequirementDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const isRequirementTargetAnchor = (
  value: Record<string, unknown> | null | undefined,
): value is RequirementReviewFieldAnchor => {
  return Boolean(value && typeof value.field === "string");
};

const isRequirementReviewFieldAnchor = isRequirementTargetAnchor;

const renderHighlightedValue = (
  value: string,
  targetAnchors: RequirementReviewFieldAnchor[],
) => {
  const quote = targetAnchors
    .map((targetAnchor) => targetAnchor.quote)
    .find((item): item is string => Boolean(item && value.includes(item)));

  if (!quote) {
    return value;
  }
  const position = value.indexOf(quote);
  const before = value.slice(0, position);
  const after = value.slice(position + quote.length);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-[var(--status-warning-bg)] px-0.5 text-[var(--status-warning-fg)]">
        {quote}
      </mark>
      {after}
    </>
  );
};

const getRequirementAnchorFieldValue = (
  requirement: {
    requirement_code: string;
    requirement_type: string;
    title: string;
    description?: string | null;
    rationale?: string | null;
    acceptance_criteria?: string | null;
    priority?: string | null;
    status?: string | null;
    source?: string | null;
    category?: string | null;
  },
  field: string,
) => {
  switch (field) {
    case "requirement_code":
      return requirement.requirement_code;
    case "title":
      return requirement.title;
    case "description":
      return requirement.description ?? "";
    case "rationale":
      return requirement.rationale ?? "";
    case "acceptance_criteria":
      return requirement.acceptance_criteria ?? "";
    case "source":
      return requirement.source ?? "";
    case "category":
      return requirement.category ?? "";
    case "requirement_type":
      return getRequirementTypeLabel(requirement.requirement_type);
    case "priority":
      return getRequirementPriorityLabel(requirement.priority);
    case "status":
      return getRequirementStatusLabel(requirement.status);
    default:
      return "";
  }
};
