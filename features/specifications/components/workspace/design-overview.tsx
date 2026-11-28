import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { canUpdateDocument } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDateTime } from "@/lib/format/date";
import type { SpecificationListItem } from "@/lib/api/generated/model";
import { designKey, readDesignOverview } from "../../lib/workspace";
import {
  kindLabels,
  specificationCode,
  specificationHref,
  statusLabels,
} from "../../lib/specification";
import { DesignReviewQueue } from "./design-review-requests";

export function DesignOverview({ projectId }: { projectId: number }) {
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const overview = useQuery({
    queryKey: [...designKey(projectId), "overview"],
    queryFn: () => readDesignOverview(projectId),
  });
  if (overview.isPending) return <p role="status">設計概要を読み込み中…</p>;
  if (overview.error)
    return (
      <DataLoadError
        resourceName="設計概要"
        isRetrying={overview.isFetching}
        onRetry={() => void overview.refetch()}
      />
    );
  if (!overview.data) return null;
  const { counts, pending, recent, groups, group_counts, linked_requirements } =
    overview.data;
  const row = (item: SpecificationListItem) => (
    <li
      className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-2 text-sm"
      key={item.id}
    >
      <span className="font-mono text-xs text-muted-foreground">
        {specificationCode(item)}
      </span>
      <Link
        className="min-w-0 truncate hover:underline"
        href={specificationHref(projectId, item.id)}
      >
        {item.title}
      </Link>
      <span className="text-xs text-muted-foreground">
        {statusLabels[item.status]}
      </span>
    </li>
  );
  return (
    <div className="space-y-7">
      <section className="grid gap-4 sm:grid-cols-3">
        {(["screen", "api", "database"] as const).map((kind) => {
          const relevant = counts.filter((count) => count.kind === kind);
          const total = relevant.reduce((sum, count) => sum + count.count, 0);
          const approved =
            relevant.find((count) => count.status === "approved")?.count ?? 0;
          return (
            <Link
              key={kind}
              href={`${specificationHref(projectId)}?kind=${kind}`}
              className="group block min-w-0 border-b pb-3"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-medium group-hover:underline">
                  {kindLabels[kind]}
                </h2>
                <span className="text-2xl font-semibold tabular-nums">
                  {total}
                  <span className="ml-1 text-xs font-normal">件</span>
                </span>
              </div>
              <div
                className="my-2 h-1.5 rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${total ? (approved / total) * 100 : 0}%` }}
                />
              </div>
              <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <span key={status}>
                    {label}{" "}
                    {relevant.find((count) => count.status === status)?.count ??
                      0}
                  </span>
                ))}
              </p>
            </Link>
          );
        })}
      </section>
      <DesignReviewQueue
        projectId={projectId}
        canEdit={canUpdateDocument(currentProjectRole)}
      />
      <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr]">
        <section>
          <h2 className="border-b pb-2 text-base font-semibold">
            対応が必要な設計
          </h2>
          {pending.length ? (
            <ul className="divide-y">{pending.map(row)}</ul>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              レビュー待ち・修正依頼はありません。
            </p>
          )}
          <h2 className="mt-6 border-b pb-2 text-base font-semibold">
            最近更新された設計
          </h2>
          {recent.length ? (
            <ul className="divide-y">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <Link
                    className="truncate hover:underline"
                    href={specificationHref(projectId, item.id)}
                  >
                    {item.title}
                  </Link>
                  <time
                    dateTime={item.updated_at}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatDateTime(item.updated_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              登録済みの設計はありません。
            </p>
          )}
        </section>
        <section className="text-sm">
          <h2 className="border-b pb-2 text-base font-semibold">
            機能グループ別の設計
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 font-medium">機能グループ</th>
                <th>画面</th>
                <th>API</th>
                <th>DB</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr className="border-b" key={group.id}>
                  <th className="py-2 font-normal">
                    <Link
                      className="hover:underline"
                      href={`${specificationHref(projectId)}?kind=screen&group=${group.id}`}
                    >
                      {group.name}
                    </Link>
                  </th>
                  {(["screen", "api", "database"] as const).map((kind) => (
                    <td className="tabular-nums" key={kind}>
                      <Link
                        href={`${specificationHref(projectId)}?kind=${kind}&group=${group.id}`}
                      >
                        {group_counts[group.id]?.[kind] ?? 0}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="py-3 text-muted-foreground">
            要件に紐付いた設計 {linked_requirements}件
          </p>
        </section>
      </div>
    </div>
  );
}
