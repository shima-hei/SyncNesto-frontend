"use client";

import { useState } from "react";

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

type CommentTargetMode = "section" | "requirement";

type RequirementDocumentRequirementsTabProps = {
  projectId: number;
  documentId: number;
  canCreate: boolean;
  canUpdate: boolean;
  canComment: boolean;
  canReview: boolean;
};

export function RequirementDocumentRequirementsTab({
  projectId,
  documentId,
  canCreate,
  canUpdate,
  canComment,
  canReview,
}: RequirementDocumentRequirementsTabProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );
  const [selectedRequirement, setSelectedRequirement] =
    useState<RequirementRead | null>(null);
  const [commentTargetMode, setCommentTargetMode] =
    useState<CommentTargetMode>("section");
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useState<RequirementReviewTargetAnchor | null>(null);
  const [activeAnchorKey, setActiveAnchorKey] = useState<string | null>(null);
  const { sections } = useRequirementSections(projectId, documentId);
  const selectedRequirementId = selectedRequirement?.id ?? null;
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
    commentTargetMode === "requirement" && selectedRequirement
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

  const handleSelectSection = (sectionId: number | null) => {
    setSelectedSectionId(sectionId);
    setSelectedRequirement(null);
    setCommentTargetMode("section");
    setSelectedTargetAnchor(null);
  };

  const handleSelectRequirement = (requirement: RequirementRead) => {
    setCommentTargetMode("requirement");
    setSelectedRequirement((current) => {
      if (current?.id !== requirement.id) {
        setSelectedTargetAnchor(null);
      }
      return requirement;
    });
  };

  const handleSelectRequirementAnchor = (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor,
  ) => {
    setCommentTargetMode("requirement");
    setSelectedRequirement(requirement);
    setSelectedTargetAnchor(targetAnchor);
  };

  const handleActivateSectionComments = () => {
    if (!selectedSectionId) {
      return;
    }
    setCommentTargetMode("section");
    setSelectedTargetAnchor(null);
  };

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return;
    }
    const anchorKey = getRequirementReviewAnchorKey(targetAnchor);
    const element = window.document.querySelector(
      `[data-requirement-review-anchor-key="${anchorKey}"]`,
    );

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
        selectedSection.content ?? "",
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
    <div className="grid gap-4 2xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(280px,360px)] 2xl:items-start">
      <div className="min-w-0 2xl:sticky 2xl:top-20">
        <RequirementSectionsSection
          projectId={projectId}
          documentId={documentId}
          canUpdate={canUpdate}
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <SelectedRequirementSectionContent
          projectId={projectId}
          documentId={documentId}
          sectionId={selectedSectionId}
          canUpdate={canUpdate}
          targetAnchors={sectionTargetAnchors}
          activeAnchorKey={activeAnchorKey}
          onSelectTargetAnchor={(targetAnchor) => {
            setCommentTargetMode("section");
            setSelectedTargetAnchor(targetAnchor);
          }}
          onActivateSectionComments={handleActivateSectionComments}
          onDeleted={() => {
            setSelectedSectionId(null);
            setSelectedRequirement(null);
            setCommentTargetMode("section");
            setSelectedTargetAnchor(null);
          }}
        />
        <RequirementsListSection
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

      <div className="min-w-0 2xl:sticky 2xl:top-20">
        {reviewTarget ? (
          <div className="flex flex-col gap-4">
            {commentTargetMode === "requirement" && selectedRequirementId ? (
              <SelectedRequirementSummarySection
                projectId={projectId}
                documentId={documentId}
                requirementId={selectedRequirementId}
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
