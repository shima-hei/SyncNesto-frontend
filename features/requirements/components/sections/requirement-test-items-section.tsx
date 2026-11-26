"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { RelatedItemsGroup } from "@/components/shared/detail/related-items-group";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { listRequirementTestItemsProjectsProjectIdRequirementsRequirementIdTestItemsGet as listItems } from "@/lib/api/generated/test-collaboration/test-collaboration";

export function useRequirementTestItems(
  projectId: number,
  requirementId: number,
) {
  return useQuery({
    queryKey: ["requirement-test-items", projectId, requirementId],
    staleTime: 30_000,
    queryFn: () => listItems(projectId, requirementId),
  });
}

export function RequirementTestItemsSection({
  projectId,
  requirementId,
  needsImpactReview = false,
}: {
  projectId: number;
  requirementId: number;
  needsImpactReview?: boolean;
}) {
  const query = useRequirementTestItems(projectId, requirementId);
  const active = (query.data ?? []).filter((row) => !row.item_deleted);
  return (
    <RelatedItemsGroup
      title="テスト項目"
      count={query.isSuccess ? active.length : undefined}
    >
      {needsImpactReview && active.length > 0 ? (
        <p className="text-[var(--status-warning-fg)]">
          承認済み版から要件が変更されています。関連テストへの影響を確認してください。
        </p>
      ) : null}

      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          関連項目を読み込み中…
        </p>
      ) : query.isError ? (
        <DataLoadError
          resourceName="関連テスト項目"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.length ? (
        <ul className="divide-y">
          {query.data.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5 text-sm"
            >
              {row.item_deleted ? (
                <span className="font-medium">
                  {row.item_code} {row.item_content || "（内容なし）"}
                </span>
              ) : (
                <Link
                  className="font-medium underline"
                  href={`/projects/joined/${projectId}/test-designs/${row.design_id}?tab=items&item=${row.item_id}`}
                >
                  {row.item_code} {row.item_content || "（内容なし）"}
                </Link>
              )}
              <p className="text-xs text-muted-foreground">
                {row.design_name}
                {row.item_deleted ? " · 項目削除済み" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </RelatedItemsGroup>
  );
}
