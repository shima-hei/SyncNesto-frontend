"use client";

import Link from "next/link";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import type { TaskOrigin } from "@/lib/navigation/task-origin";
import { useQuery } from "@tanstack/react-query";
import { RelatedItemsGroup } from "@/components/shared/detail/related-items-group";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import {
  canCreateDocument,
  canViewRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { SpecificationLinkCreate } from "@/lib/api/generated/model";
import { relatedSpecifications } from "../lib/api";
import {
  specificationHref,
  specificationCode,
  kindLabels,
  statusLabels,
} from "../lib/specification";

export function RelatedSpecifications({
  projectId,
  targetType,
  targetId,
  origin,
  grouped = false,
  needsImpactReview = false,
}: {
  projectId: number;
  targetType: SpecificationLinkCreate["target_type"];
  targetId: string;
  origin?: TaskOrigin;
  grouped?: boolean;
  needsImpactReview?: boolean;
}) {
  const { withOrigin } = useTaskOrigin(projectId, origin);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canRead = canViewRequirement(currentProjectRole);
  const query = useQuery({
    queryKey: ["related-specifications", projectId, targetType, targetId],
    queryFn: () =>
      relatedSpecifications(projectId, {
        target_type: targetType,
        target_id: targetId,
      }),
    enabled: canRead,
    retry: false,
  });
  if (!canRead) return null;
  const source = new URLSearchParams({
    source: targetType,
    sourceId: targetId,
  });

  if (grouped) {
    return (
      <>
        {needsImpactReview && !!query.data?.length ? (
          <p className="mb-2 text-sm text-[var(--status-warning-fg)]">
            承認済み版から要件が変更されています。関連する設計への影響を確認してください。
          </p>
        ) : null}
        {query.error ? (
          <DataLoadError
            resourceName="関連設計書"
            isRetrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {(["screen", "api"] as const).map((kind) => {
          const rows = query.data?.filter((row) => row.kind === kind);
          return (
            <RelatedItemsGroup
              key={kind}
              title={kindLabels[kind]}
              count={rows?.length}
              action={
                canCreateDocument(currentProjectRole) ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`${specificationHref(projectId)}/new?kind=${kind}&${source}`}
                    >
                      {kindLabels[kind]}を作成
                    </Link>
                  </Button>
                ) : null
              }
            >
              {query.isPending ? (
                <p role="status" className="text-xs text-muted-foreground">
                  読み込み中…
                </p>
              ) : rows?.length ? (
                <ul className="divide-y">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5 text-sm"
                    >
                      <Link
                        className="min-w-0 break-words font-medium underline-offset-4 hover:underline"
                        href={withOrigin(specificationHref(projectId, row.id))}
                      >
                        <span className="mr-2 text-xs text-muted-foreground">
                          {specificationCode(row)}
                        </span>
                        {row.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {statusLabels[row.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </RelatedItemsGroup>
          );
        })}
        {query.data?.length === 100 && (
          <Button asChild size="sm" variant="link" className="px-0">
            <Link href={withOrigin(specificationHref(projectId))}>
              設計書一覧を開く（関連は最大100件表示）
            </Link>
          </Button>
        )}
      </>
    );
  }
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t pt-4">
      <h3 className="font-semibold">関連する画面・API設計</h3>
      {needsImpactReview && !!query.data?.length ? (
        <p className="text-sm text-[var(--status-warning-fg)]">
          承認済み版から要件が変更されています。関連する設計への影響を確認してください。
        </p>
      ) : null}
      {query.isPending ? (
        <p role="status" className="text-sm">
          設計書を読み込み中…
        </p>
      ) : query.error ? (
        <DataLoadError
          resourceName="関連設計書"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.length ? (
        <ul className="flex flex-col gap-2">
          {query.data.map((row) => (
            <li key={row.id}>
              <Link
                className="break-words text-sm font-medium underline-offset-4 hover:underline"
                href={withOrigin(specificationHref(projectId, row.id))}
              >
                {row.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {kindLabels[row.kind]}・{statusLabels[row.status]}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          関連する設計書はまだありません。
        </p>
      )}
      {query.data?.length === 100 && (
        <p className="text-xs text-muted-foreground">
          関連する設計書を最大100件表示しています。設計書一覧でも確認してください。
        </p>
      )}
      {canCreateDocument(currentProjectRole) && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href={`${specificationHref(projectId)}/new?kind=screen&${source}`}
            >
              画面の設計へ進む
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              href={`${specificationHref(projectId)}/new?kind=api&${source}`}
            >
              APIの設計へ進む
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
