"use client";

import Link from "next/link";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import type { TaskOrigin } from "@/lib/navigation/task-origin";
import { useQuery } from "@tanstack/react-query";
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
  kindLabels,
  statusLabels,
} from "../lib/specification";

export function RelatedSpecifications({
  projectId,
  targetType,
  targetId,
  origin,
}: {
  projectId: number;
  targetType: SpecificationLinkCreate["target_type"];
  targetId: string;
  origin?: TaskOrigin;
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
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t pt-4">
      <h3 className="font-semibold">関連する画面・API設計</h3>
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
