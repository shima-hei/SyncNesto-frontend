"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementCommentRead } from "@/lib/api/generated/model";

import { RequirementCommentForm } from "../forms/requirement-comment-form";
import { useCreateRequirementComment } from "../../hooks/use-create-requirement-comment";
import { useDeleteRequirementComment } from "../../hooks/use-delete-requirement-comment";
import { useRequirementComments } from "../../hooks/use-requirement-comments";
import { RequirementSectionSkeleton } from "./requirement-section-skeleton";

type RequirementCommentsSectionProps = {
  projectId: number;
  requirementId: number;
  canComment: boolean;
};

export function RequirementCommentsSection({
  projectId,
  requirementId,
  canComment,
}: RequirementCommentsSectionProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementCommentRead | null>(null);
  const { comments, isLoading } = useRequirementComments(
    projectId,
    requirementId
  );
  const {
    createRequirementComment,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementComment(projectId, requirementId);
  const { deleteRequirementComment, isPending: isDeletePending } =
    useDeleteRequirementComment(projectId, requirementId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">コメント</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canComment ? (
          <RequirementCommentForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementComment}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : comments.length ? (
          <div className="flex flex-col gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      ユーザーID: {comment.user_id} /{" "}
                      {formatDateTime(comment.created_at)}
                    </span>
                    <p className="whitespace-pre-wrap text-sm">
                      {comment.comment}
                    </p>
                  </div>
                  {canComment ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(comment)}
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
          <p className="text-sm text-muted-foreground">コメントはありません。</p>
        )}

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="コメント"
          description="コメントを削除します。削除すると元に戻せません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementComment(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
