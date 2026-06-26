"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RequirementApprovalsSection } from "../../sections/requirement-approvals-section";
import { RequirementChangeLogsSection } from "../../sections/requirement-change-logs-section";
import { RequirementTargetCommentsSection } from "../../sections/requirement-target-comments-section";

type SelectedSectionSupportTabsProps = {
  projectId: number;
  documentId: number;
  sectionId: number;
  canComment: boolean;
  canReview: boolean;
};

export function SelectedSectionSupportTabs({
  projectId,
  documentId,
  sectionId,
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
          targetType="section"
          targetId={sectionId}
          title="セクションコメント"
          canComment={canComment}
        />
      </TabsContent>

      <TabsContent value="approvals">
        <RequirementApprovalsSection
          projectId={projectId}
          targetType="section"
          targetId={sectionId}
          title="セクションの承認"
          canReview={canReview}
        />
      </TabsContent>

      <TabsContent value="history">
        <RequirementChangeLogsSection
          projectId={projectId}
          documentId={documentId}
          title="セクションの変更履歴"
          targetType="requirement_section"
          targetId={sectionId}
        />
      </TabsContent>
    </Tabs>
  );
}
