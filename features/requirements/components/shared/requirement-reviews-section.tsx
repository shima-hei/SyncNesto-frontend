"use client";

import { useState } from "react";
import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementReviewRead } from "@/lib/api/generated/model";

import { getRequirementReviewStatusLabel } from "../../constants/requirement-options";
import { useCreateRequirementReview } from "../../hooks/use-create-requirement-review";
import { useDeleteRequirementReview } from "../../hooks/use-delete-requirement-review";
import { useRequirementReviews } from "../../hooks/use-requirement-reviews";
import { useUpdateRequirementReview } from "../../hooks/use-update-requirement-review";
import {
  getRequirementReviewFormValues,
  RequirementReviewForm,
} from "../forms/requirement-review-form";
import { RequirementSectionSkeleton } from "./requirement-section-skeleton";

type RequirementReviewsSectionProps = {
  projectId: number;
  requirementId: number;
  canReview: boolean;
};

export function RequirementReviewsSection({
  projectId,
  requirementId,
  canReview,
}: RequirementReviewsSectionProps) {
  const [editTarget, setEditTarget] = useState<RequirementReviewRead | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<RequirementReviewRead | null>(
    null
  );
  const { reviews, isLoading } = useRequirementReviews(projectId, requirementId);
  const {
    createRequirementReview,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementReview(projectId, requirementId);
  const {
    updateRequirementReview,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateRequirementReview(projectId, requirementId);
  const { deleteRequirementReview, isPending: isDeletePending } =
    useDeleteRequirementReview(projectId, requirementId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">レビュー</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canReview ? (
          <RequirementReviewForm
            mode="create"
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementReview}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : reviews.length ? (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      レビュー担当ID: {review.reviewer_id} /{" "}
                      {formatDateTime(review.updated_at)}
                    </span>
                    <span className="text-sm font-medium">
                      {getRequirementReviewStatusLabel(review.status)}
                    </span>
                    {review.comment ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                  {canReview ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTarget(review)}
                      >
                        <EditIcon data-icon="inline-start" />
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(review)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        削除
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">レビューはありません。</p>
        )}

        <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>レビュー編集</DialogTitle>
              <DialogDescription>
                レビューステータスとコメントを更新します。
              </DialogDescription>
            </DialogHeader>
            {editTarget ? (
              <RequirementReviewForm
                key={editTarget.id}
                mode="update"
                initialValues={getRequirementReviewFormValues(editTarget)}
                isPending={isUpdatePending}
                error={updateError}
                onSubmit={async (values) => {
                  await updateRequirementReview(editTarget.id, values);
                  setEditTarget(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="レビュー"
          description="レビューを削除します。削除すると元に戻せません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementReview(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
