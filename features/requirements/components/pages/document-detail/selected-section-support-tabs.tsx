"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RequirementApprovalsSection } from "../../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../../sections/requirement-change-logs-section";
import { RequirementTargetCommentsSection } from "../../sections/requirement-target-comments-section";
import type { ReviewAnchorStatus } from "../../../lib/requirement-review-anchor";

type SelectedSectionSupportTabsProps = {
  projectId: number;
  documentId: number;
  commentTargetType: string;
  commentTargetId: number;
  commentTitle: string;
  targetLabel?: string;
  selectedTargetAnchor?: Record<string, unknown> | null;
  onTargetAnchorClick?: (targetAnchor: Record<string, unknown>) => void;
  getTargetAnchorStatus?: (
    targetAnchor: Record<string, unknown>
  ) => ReviewAnchorStatus | null;
  approvalTargetType: string;
  approvalTargetId: number;
  approvalTitle: string;
  historyTargetType: string;
  historyTargetId: number;
  historyTitle: string;
  canComment: boolean;
  canReview: boolean;
};

export function SelectedSectionSupportTabs({
  projectId,
  documentId,
  commentTargetType,
  commentTargetId,
  commentTitle,
  targetLabel,
  selectedTargetAnchor = null,
  onTargetAnchorClick,
  getTargetAnchorStatus,
  approvalTargetType,
  approvalTargetId,
  approvalTitle,
  historyTargetType,
  historyTargetId,
  historyTitle,
  canComment,
  canReview,
}: SelectedSectionSupportTabsProps) {
  return (
    <Tabs defaultValue="comments" className="gap-3">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="comments">コメント</TabsTrigger>
        <TabsTrigger value="approvals">承認</TabsTrigger>
        <TabsTrigger value="history">履歴</TabsTrigger>
      </TabsList>

      <TabsContent value="comments">
        <RequirementTargetCommentsSection
          projectId={projectId}
          targetType={commentTargetType}
          targetId={commentTargetId}
          title={commentTitle}
          canComment={canComment}
          targetLabel={targetLabel}
          selectedTargetAnchor={selectedTargetAnchor}
          onTargetAnchorClick={onTargetAnchorClick}
          getTargetAnchorStatus={getTargetAnchorStatus}
          showTargetAnchorInput={false}
        />
      </TabsContent>

      <TabsContent value="approvals">
        <RequirementApprovalsSection
          projectId={projectId}
          targetType={approvalTargetType}
          targetId={approvalTargetId}
          title={approvalTitle}
          canReview={canReview}
        />
      </TabsContent>

      <TabsContent value="history">
        <RequirementChangeLogsSection
          projectId={projectId}
          documentId={documentId}
          title={historyTitle}
          targetType={historyTargetType}
          targetId={historyTargetId}
        />
      </TabsContent>
    </Tabs>
  );
}
