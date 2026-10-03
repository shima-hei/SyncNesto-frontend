"use client";

import Link from "next/link";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { useHomeProjects } from "../../hooks/use-home";
import { formatCalendarDate } from "../../lib/home-display";

export function HomeProjectsSection({
  query,
}: {
  query: ReturnType<typeof useHomeProjects>;
}) {
  return (
    <section
      aria-labelledby="home-projects-title"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h2 id="home-projects-title" className="text-base font-semibold">
            参加中のプロジェクト
          </h2>
          {query.data ? (
            <span className="text-xs text-muted-foreground">
              {query.data.total}件
            </span>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects/joined">すべてのプロジェクト</Link>
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="参加プロジェクト"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : query.data.items.length ? (
        <>
          <p className="text-xs text-muted-foreground">
            自分のタスクは未完了件数、期限超過と完了 /
            全体は案件内のタスク件数です。
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プロジェクト</TableHead>
                <TableHead className="text-right">自分のタスク</TableHead>
                <TableHead className="text-right">期限超過</TableHead>
                <TableHead className="hidden text-right @min-[40rem]/home:table-cell">
                  完了 / 全体
                </TableHead>
                <TableHead className="hidden text-right @min-[40rem]/home:table-cell">
                  次の期限
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((project) => {
                const href = `/projects/joined/${project.id}`;
                const stats = project.tasks;
                return (
                  <ClickableTableRow
                    key={project.id}
                    href={href}
                    aria-label={`${project.name}の概要を開く`}
                  >
                    <TableCell className="max-w-64 whitespace-normal">
                      <div className="flex min-w-32 flex-col gap-1">
                        <Link
                          href={href}
                          className="font-medium hover:underline focus-visible:underline"
                        >
                          {project.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {project.project_code}
                        </span>
                        {stats ? (
                          <span className="text-xs text-muted-foreground @min-[40rem]/home:hidden">
                            完了 {stats.done_count} / {stats.total_count}
                            ・次の期限{" "}
                            {stats.next_due_date
                              ? formatCalendarDate(stats.next_due_date)
                              : "なし"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            タスク閲覧権限がありません
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {stats ? (
                        <Link
                          href={`${href}/tasks?assignee=me`}
                          className="underline-offset-4 hover:underline focus-visible:underline"
                          aria-label={`${project.name}の自分のタスク一覧を開く`}
                        >
                          {stats.my_open_count}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        stats &&
                          stats.overdue_count > 0 &&
                          "text-[var(--status-warning-fg)]",
                      )}
                    >
                      {stats?.overdue_count ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums @min-[40rem]/home:table-cell">
                      {stats
                        ? `${stats.done_count} / ${stats.total_count}`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right @min-[40rem]/home:table-cell">
                      {stats?.next_due_date ? (
                        <time dateTime={stats.next_due_date}>
                          {formatCalendarDate(stats.next_due_date)}
                        </time>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </ClickableTableRow>
                );
              })}
            </TableBody>
          </Table>
          {query.data.total > query.data.items.length ? (
            <p className="text-xs text-muted-foreground">
              {query.data.total}件中{query.data.items.length}
              件を表示しています。
            </p>
          ) : null}
        </>
      ) : (
        <EmptyState
          message="参加中のプロジェクトはありません。"
          className="py-4"
        />
      )}
    </section>
  );
}
