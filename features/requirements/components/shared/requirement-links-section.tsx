"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/features/projects/components/tables/projects-table";
import type { RequirementLinkRead } from "@/lib/api/generated/model";

import { getRequirementLinkTypeLabel } from "../../constants/requirement-options";
import { useCreateRequirementLink } from "../../hooks/use-create-requirement-link";
import { useDeleteRequirementLink } from "../../hooks/use-delete-requirement-link";
import { useRequirementLinks } from "../../hooks/use-requirement-links";
import { RequirementLinkForm } from "../forms/requirement-link-form";
import { RequirementSectionSkeleton } from "./requirement-section-skeleton";

type RequirementLinksSectionProps = {
  projectId: number;
  requirementId: number;
  canLink: boolean;
};

export function RequirementLinksSection({
  projectId,
  requirementId,
  canLink,
}: RequirementLinksSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<RequirementLinkRead | null>(
    null
  );
  const { links, isLoading } = useRequirementLinks(projectId, requirementId);
  const {
    createRequirementLink,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementLink(projectId, requirementId);
  const { deleteRequirementLink, isPending: isDeletePending } =
    useDeleteRequirementLink(projectId, requirementId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">関連成果物</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canLink ? (
          <RequirementLinkForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementLink}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : links.length ? (
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <div key={link.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {getRequirementLinkTypeLabel(link.linked_type)} /{" "}
                      {formatDateTime(link.created_at)}
                    </span>
                    <span className="break-words text-sm font-medium">
                      {link.linked_id}
                    </span>
                  </div>
                  {canLink ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(link)}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      削除
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            関連成果物はありません。
          </p>
        )}

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="関連成果物"
          description="関連成果物の紐づけを削除します。成果物本体は削除されません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementLink(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
