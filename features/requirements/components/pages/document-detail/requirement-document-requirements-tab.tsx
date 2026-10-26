"use client";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import { useRequirement } from "../../../hooks/use-requirement";
import { FormApiError } from "@/components/shared/forms/form-api-error";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementRead } from "@/lib/api/generated/model";

import {
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../../constants/requirement-options";
import { useRequirementSections } from "../../../hooks/use-requirement-sections";
import { useTargetComments } from "../../../hooks/use-target-comments";
import {
  evaluateRequirementReviewAnchor,
  getRequirementReviewAnchorKey,
  getUnresolvedReviewAnchors,
  isRequirementReviewTargetAnchor,
  type RequirementReviewTargetAnchor,
} from "../../../lib/requirement-review-anchor";
import { RequirementSectionsSection } from "../../sections/requirement-sections-section";
import { RequirementsListSection } from "../../sections/requirements-list-section";
import { SelectedRequirementSectionContent } from "../../sections/selected-requirement-section-content";
import { SelectedRequirementSummarySection } from "../../sections/selected-requirement-summary-section";
import { SelectedSectionSupportTabs } from "./selected-section-support-tabs";
import {
  WorkbenchTargetScope,
  useWorkbenchState,
  useWorkbenchScope,
} from "../../../hooks/use-workbench-state";
import { captureWorkbenchReturnPoint } from "../../../hooks/use-workbench-return-navigation";
import { cn } from "@/lib/utils";
import { useListNavigation } from "@/hooks/use-list-navigation";

type CommentTargetMode = "section" | "requirement";

type RequirementDocumentRequirementsTabProps = {
  projectId: number;
  documentId: number;
  selectedSectionId: number | null;
  onSelectSection: (sectionId: number | null) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canComment: boolean;
  canReview: boolean;
};

export function RequirementDocumentRequirementsTab({
  projectId,
  documentId,
  selectedSectionId,
  onSelectSection,
  canCreate,
  canUpdate,
  canComment,
  canReview,
}: RequirementDocumentRequirementsTabProps) {
  const router = useRouter();
  const workbenchRef = useRef<HTMLDivElement>(null);
  const workbenchScope = useWorkbenchScope();
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/requirements/${documentId}?tab=requirements`,
  );
  const supportPanelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const [panelMode, setPanelMode] = useUrlFilterState("supportPanel", "auto");
  const [selectedRequirementId, setSelectedRequirementId] = useUrlFilterState<
    number | null
  >("selectedRequirement", null);
  const selectedQuery = useRequirement(projectId, selectedRequirementId ?? 0, {
    enabled: Boolean(selectedRequirementId),
  });
  const selectedRequirement =
    selectedQuery.requirement?.document_id === documentId
      ? selectedQuery.requirement
      : null;
  const [commentTargetMode, setCommentTargetMode] =
    useUrlFilterState<CommentTargetMode>("reviewTarget", "requirement");
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useWorkbenchState<RequirementReviewTargetAnchor | null>(
      "selected-anchor",
      null,
    );
  const [activeAnchorKey, setActiveAnchorKey] = useState<string | null>(null);
  const { sections } = useRequirementSections(projectId, documentId);
  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId,
  );
  const { comments: sectionComments } = useTargetComments(
    projectId,
    "section",
    selectedSectionId ?? 0,
    { enabled: Boolean(selectedSectionId) },
  );
  const { comments: requirementComments } = useTargetComments(
    projectId,
    "requirement_item",
    selectedRequirementId ?? 0,
    { enabled: Boolean(selectedRequirementId) },
  );
  const sectionTargetAnchors = getUnresolvedReviewAnchors(
    sectionComments,
  ).filter((targetAnchor) => targetAnchor.scope === "section_review");
  const requirementTargetAnchors = getUnresolvedReviewAnchors(
    requirementComments,
  ).filter(
    (targetAnchor) => targetAnchor.scope === "section_requirements_review",
  );
  const reviewTarget =
    selectedRequirementId &&
    commentTargetMode === "requirement" &&
    !selectedRequirement
      ? null
      : commentTargetMode === "requirement" && selectedRequirement
        ? {
            targetType: "requirement_item",
            targetId: selectedRequirement.id,
            title: `要件コメント: ${selectedRequirement.requirement_code}`,
            label: `${selectedRequirement.requirement_code} ${selectedRequirement.title}`,
            approvalTargetType: "requirement_item",
            approvalTargetId: selectedRequirement.id,
            approvalTitle: "要件の承認",
            historyTargetType: "requirement",
            historyTargetId: selectedRequirement.id,
            historyTitle: "要件の変更履歴",
          }
        : selectedSectionId
          ? {
              targetType: "section",
              targetId: selectedSectionId,
              title: "セクションコメント",
              label: selectedSection?.title ?? "選択中セクション",
              approvalTargetType: "section",
              approvalTargetId: selectedSectionId,
              approvalTitle: "セクションの承認",
              historyTargetType: "requirement_section",
              historyTargetId: selectedSectionId,
              historyTitle: "セクションの変更履歴",
            }
          : null;
  const panelOpen =
    panelMode === "open" ||
    (panelMode === "auto" && Boolean(selectedRequirementId));
  const openPanel = () => {
    originRef.current = window.document.activeElement as HTMLElement | null;
    setPanelMode("open");
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (
        panel &&
        panel.getBoundingClientRect().left <=
          (panel.parentElement?.getBoundingClientRect().left ?? 0) + 1
      ) {
        panel.scrollIntoView({ block: "start" });
        panel.focus({ preventScroll: true });
      }
    });
  };
  const closePanel = () => {
    setPanelMode("closed");
    requestAnimationFrame(() => {
      const row = selectedRequirementId
        ? window.document.querySelector<HTMLElement>(
            `[data-workbench-requirement-id="${selectedRequirementId}"]`,
          )
        : null;
      const target =
        row ??
        (!selectedRequirementId
          ? window.document.querySelector<HTMLElement>(
              'textarea[id^="section-body-"], [data-requirement-section-field="title"]',
            )
          : null) ??
        (originRef.current?.isConnected ? originRef.current : null) ??
        window.document.querySelector<HTMLElement>(
          "[data-workbench-panel-trigger]",
        );
      target?.focus({ preventScroll: true });
      if (
        target &&
        panelRef.current &&
        panelRef.current.getBoundingClientRect().width === 0
      ) {
        target.scrollIntoView({ block: "nearest" });
      }
    });
  };

  const handleSelectSection = (sectionId: number | null) => {
    onSelectSection(sectionId);
    setSelectedRequirementId(null);
    setCommentTargetMode("section");
    setSelectedTargetAnchor(null);
    setActiveAnchorKey(null);
  };

  const handleSelectRequirement = (requirement: RequirementRead) => {
    setCommentTargetMode("requirement");
    if (selectedRequirement?.id !== requirement.id) {
      setSelectedTargetAnchor(null);
    }
    setSelectedRequirementId(requirement.id);
    openPanel();
  };

  const handleSelectRequirementAnchor = (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor,
  ) => {
    setCommentTargetMode("requirement");
    setSelectedRequirementId(requirement.id);
    setSelectedTargetAnchor(targetAnchor);
    openPanel();
  };

  const handleActivateSectionComments = () => {
    if (!selectedSectionId) {
      return;
    }
    setCommentTargetMode("section");
    setSelectedTargetAnchor(null);
    openPanel();
  };

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return;
    }
    const anchorKey = getRequirementReviewAnchorKey(targetAnchor);
    const element =
      window.document.querySelector(
        `[data-requirement-review-anchor-key="${CSS.escape(anchorKey)}"]`,
      ) ??
      (targetAnchor.scope === "section_review"
        ? window.document.querySelector(
            `[data-requirement-section-field="${CSS.escape(targetAnchor.field)}"]`,
          )
        : null);

    if (
      !element &&
      selectedRequirement &&
      targetAnchor.scope === "section_requirements_review"
    ) {
      if (workbenchScope)
        captureWorkbenchReturnPoint(
          workbenchRef.current,
          workbenchScope.identity,
          workbenchScope.scope,
        );
      router.push(
        withReturn(
          `/projects/joined/${projectId}/requirements/${documentId}/items/${selectedRequirement.id}#requirement-field-${encodeURIComponent(targetAnchor.field)}`,
        ),
      );
      return;
    }

    for (
      let parent = element?.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveAnchorKey(anchorKey);
    window.setTimeout(() => {
      setActiveAnchorKey((current) => (current === anchorKey ? null : current));
    }, 1600);
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return null;
    }

    if (targetAnchor.scope === "section_review" && selectedSection) {
      return evaluateRequirementReviewAnchor(
        targetAnchor,
        targetAnchor.field === "title"
          ? selectedSection.title
          : (selectedSection.content ?? ""),
        selectedSection.version,
      );
    }

    if (
      targetAnchor.scope === "section_requirements_review" &&
      selectedRequirement
    ) {
      return evaluateRequirementReviewAnchor(
        targetAnchor,
        getRequirementAnchorFieldValue(selectedRequirement, targetAnchor.field),
        selectedRequirement.version,
      );
    }
    return null;
  };

  return (
    <div ref={workbenchRef} className="@container/requirements">
      <div className="grid min-w-0 gap-4 @min-[64rem]/requirements:grid-cols-[14rem_minmax(0,1fr)] @min-[64rem]/requirements:items-start">
        <aside className="min-w-0 @min-[64rem]/requirements:sticky @min-[64rem]/requirements:top-20 @min-[64rem]/requirements:max-h-[calc(100dvh-6rem)] @min-[64rem]/requirements:overflow-y-auto">
          <RequirementSectionsSection
            projectId={projectId}
            documentId={documentId}
            canUpdate={canUpdate}
            selectedSectionId={selectedSectionId}
            onSelectSection={handleSelectSection}
            layout="navigation"
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          {reviewTarget || selectedRequirementId ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-fit",
                panelOpen && "@min-[80rem]/requirements:hidden",
              )}
              data-workbench-panel-trigger
              aria-expanded={panelOpen}
              aria-controls={supportPanelId}
              onClick={openPanel}
            >
              {panelOpen
                ? "コメント・承認・履歴へ"
                : `${selectedRequirement?.requirement_code ?? selectedSection?.title ?? "選択中の対象"}の関連情報を表示`}
            </Button>
          ) : null}

          <div
            className={cn(
              "grid min-w-0 gap-4 @min-[80rem]/requirements:items-start",
              panelOpen &&
                "@min-[80rem]/requirements:grid-cols-[minmax(0,1fr)_20rem]",
            )}
          >
            <div className="flex min-w-0 flex-col gap-4">
              <SelectedRequirementSectionContent
                key={`section-${selectedSectionId ?? "all"}`}
                projectId={projectId}
                documentId={documentId}
                sectionId={selectedSectionId}
                canUpdate={canUpdate}
                targetAnchors={sectionTargetAnchors}
                activeAnchorKey={activeAnchorKey}
                onSelectTargetAnchor={(targetAnchor) => {
                  setCommentTargetMode("section");
                  setSelectedTargetAnchor(targetAnchor);
                  openPanel();
                }}
                onActivateSectionComments={handleActivateSectionComments}
                onDeleted={() => {
                  onSelectSection(null);
                  setSelectedRequirementId(null);
                  setCommentTargetMode("section");
                  setSelectedTargetAnchor(null);
                }}
              />
              <RequirementsListSection
                key={`requirements-${selectedSectionId ?? "all"}`}
                projectId={projectId}
                documentId={documentId}
                sectionId={selectedSectionId}
                canCreate={canCreate}
                canUpdate={canUpdate}
                selectedRequirementId={selectedRequirementId}
                targetAnchors={requirementTargetAnchors}
                activeAnchorKey={activeAnchorKey}
                onSelectRequirement={handleSelectRequirement}
                onSelectReviewAnchor={handleSelectRequirementAnchor}
              />
            </div>

            <aside
              id={supportPanelId}
              ref={panelRef}
              hidden={!panelOpen}
              data-workbench-support-panel
              data-preview-requirement-source
              tabIndex={-1}
              aria-label="選択対象のコメント・承認・履歴"
              className="min-w-0 scroll-mt-20 @min-[80rem]/requirements:sticky @min-[80rem]/requirements:top-20 @min-[80rem]/requirements:max-h-[calc(100dvh-6rem)] @min-[80rem]/requirements:overflow-y-auto @min-[80rem]/requirements:overscroll-contain"
              onKeyDown={(event) => {
                if (
                  event.key !== "Escape" ||
                  event.defaultPrevented ||
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229 ||
                  !event.currentTarget.contains(event.target as Node)
                )
                  return;
                if (
                  (event.target as HTMLElement).closest(
                    '[role="combobox"], [role="dialog"], [role="alertdialog"]',
                  )
                )
                  return;
                event.preventDefault();
                closePanel();
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mb-3"
                onClick={closePanel}
                aria-expanded={panelOpen}
                aria-controls={supportPanelId}
              >
                関連情報を閉じて要件へ戻る
              </Button>
              {selectedRequirementId && selectedQuery.isLoading ? (
                <p role="status">選択した要件を読み込み中…</p>
              ) : selectedQuery.error ? (
                <FormApiError error={selectedQuery.error} />
              ) : reviewTarget ? (
                <WorkbenchTargetScope
                  target={`${reviewTarget.targetType}:${reviewTarget.targetId}`}
                >
                  <div className="flex flex-col gap-4">
                    {commentTargetMode === "requirement" &&
                    selectedRequirementId ? (
                      <SelectedRequirementSummarySection
                        projectId={projectId}
                        documentId={documentId}
                        requirementId={selectedRequirementId}
                        canUpdate={canUpdate}
                      />
                    ) : null}
                    <SelectedSectionSupportTabs
                      projectId={projectId}
                      documentId={documentId}
                      commentTargetType={reviewTarget.targetType}
                      commentTargetId={reviewTarget.targetId}
                      commentTitle={reviewTarget.title}
                      targetLabel={reviewTarget.label}
                      selectedTargetAnchor={selectedTargetAnchor}
                      onTargetAnchorClick={handleTargetAnchorClick}
                      getTargetAnchorStatus={getTargetAnchorStatus}
                      approvalTargetType={reviewTarget.approvalTargetType}
                      approvalTargetId={reviewTarget.approvalTargetId}
                      approvalTitle={reviewTarget.approvalTitle}
                      historyTargetType={reviewTarget.historyTargetType}
                      historyTargetId={reviewTarget.historyTargetId}
                      historyTitle={reviewTarget.historyTitle}
                      canComment={canComment}
                      canReview={canReview}
                    />
                  </div>
                </WorkbenchTargetScope>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>選択中の情報</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      セクションまたは要件を選択すると、関連情報を確認できます。
                    </p>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

const getRequirementAnchorFieldValue = (
  requirement: RequirementRead,
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
    case "category":
      return requirement.category ?? "";
    case "source":
      return requirement.source ?? "";
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
