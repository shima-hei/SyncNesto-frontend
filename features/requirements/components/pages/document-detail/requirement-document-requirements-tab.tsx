"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { RequirementSectionsSection } from "../../sections/requirement-sections-section";
import { RequirementsListSection } from "../../sections/requirements-list-section";
import { SelectedRequirementSectionContent } from "../../sections/selected-requirement-section-content";
import { SelectedRequirementSummarySection } from "../../sections/selected-requirement-summary-section";
import { SelectedSectionSupportTabs } from "./selected-section-support-tabs";

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
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(
    null
  );

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(280px,360px)] 2xl:items-start">
      <div className="min-w-0 2xl:sticky 2xl:top-20">
        <RequirementSectionsSection
          projectId={projectId}
          documentId={documentId}
          canUpdate={canUpdate}
          selectedSectionId={selectedSectionId}
          onSelectSection={(sectionId) => {
            setSelectedSectionId(sectionId);
            setSelectedRequirementId(null);
          }}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <SelectedRequirementSectionContent
          projectId={projectId}
          documentId={documentId}
          sectionId={selectedSectionId}
          canUpdate={canUpdate}
          onDeleted={() => setSelectedSectionId(null)}
        />
        <RequirementsListSection
          projectId={projectId}
          documentId={documentId}
          sectionId={selectedSectionId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          selectedRequirementId={selectedRequirementId}
          onSelectRequirement={setSelectedRequirementId}
        />
      </div>

      <div className="min-w-0 2xl:sticky 2xl:top-20">
        {selectedRequirementId ? (
          <SelectedRequirementSummarySection
            projectId={projectId}
            documentId={documentId}
            requirementId={selectedRequirementId}
          />
        ) : selectedSectionId ? (
          <SelectedSectionSupportTabs
            projectId={projectId}
            documentId={documentId}
            sectionId={selectedSectionId}
            canComment={canComment}
            canReview={canReview}
          />
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
