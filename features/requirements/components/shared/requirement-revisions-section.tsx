"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format/date";

import { useRequirementRevisions } from "../../hooks/use-requirement-revisions";
import { RequirementSectionSkeleton } from "./requirement-section-skeleton";

type RequirementRevisionsSectionProps = {
  projectId: number;
  requirementId: number;
};

export function RequirementRevisionsSection({
  projectId,
  requirementId,
}: RequirementRevisionsSectionProps) {
  const { revisions, isLoading } = useRequirementRevisions(
    projectId,
    requirementId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">改訂履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : revisions.length ? (
          <div className="flex flex-col gap-3">
            {revisions.map((revision) => (
              <div key={revision.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    version {revision.version} / 変更者ID:{" "}
                    {revision.changed_by ?? "-"} /{" "}
                    {formatDateTime(revision.created_at)}
                  </span>
                  <span className="text-sm font-medium">
                    {revision.change_summary ?? "変更概要なし"}
                  </span>
                  {revision.reason ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {revision.reason}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">改訂履歴はありません。</p>
        )}
      </CardContent>
    </Card>
  );
}
