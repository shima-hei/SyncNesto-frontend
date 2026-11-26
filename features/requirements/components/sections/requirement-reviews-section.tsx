"use client";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";
import { formatDateTime } from "@/lib/format/date";
import { getRequirementReviewStatusLabel } from "../../constants/requirement-options";
import { useRequirementReviews } from "../../hooks/use-requirement-reviews";

export function RequirementReviewsSection({
  projectId,
  requirementId,
}: {
  projectId: number;
  requirementId: number;
}) {
  const { reviews, isLoading, error, refetch } = useRequirementReviews(
    projectId,
    requirementId,
  );
  const { users } = useProjectMemberUsers(projectId, { limit: 100 });
  const namesById = new Map(users.map((member) => [member.id, member.name]));

  return (
    <section aria-label="従来のレビュー記録" className="grid gap-2 text-sm">
      <h3 className="font-medium">従来のレビュー記録</h3>
      {error ? (
        <DataLoadError
          resourceName="従来のレビュー記録"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <p role="status" className="text-muted-foreground">
          レビュー記録を読み込んでいます…
        </p>
      ) : reviews.length ? (
        <ul className="divide-y">
          {reviews.map((review) => {
            const reviewedAt = review.reviewed_at ?? review.updated_at;
            return (
              <li key={review.id} className="grid gap-1 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {getRequirementReviewStatusLabel(review.status)} ・{" "}
                    {namesById.get(review.reviewer_id) ??
                      "氏名を取得できない担当者"}
                  </span>
                  <time className="text-muted-foreground" dateTime={reviewedAt}>
                    {formatDateTime(reviewedAt)}
                  </time>
                </div>
                {review.comment ? (
                  <p className="whitespace-pre-wrap break-words">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          従来のレビュー記録はありません。
        </p>
      )}
    </section>
  );
}
