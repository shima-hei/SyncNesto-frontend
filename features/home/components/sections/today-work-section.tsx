"use client";

import Link from "next/link";
import { AlertTriangleIcon, CircleIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTaskStatusLabel } from "@/features/tasks/constants/task-options";
import { cn } from "@/lib/utils";

import type { useHomeTasks } from "../../hooks/use-home";
import {
  formatCalendarDate,
  homeDueState,
  homeTaskHref,
} from "../../lib/home-display";

export function TodayWorkSection({
  query,
}: {
  query: ReturnType<typeof useHomeTasks>;
}) {
  return (
    <section
      aria-labelledby="today-work-title"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-work-title" className="text-base font-semibold">
          今日の作業
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects/joined">案件別のタスクを見る</Link>
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="自分のタスク"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              ["期限超過", query.data.summary.overdue],
              ["今日まで", query.data.summary.due_today],
              ["7日以内", query.data.summary.due_soon],
              ["自分の未完了タスク", query.data.summary.total],
            ].map(([label, count]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    label === "期限超過" &&
                      Number(count) > 0 &&
                      "text-[var(--status-warning-fg)]",
                  )}
                >
                  {count}
                </dd>
              </div>
            ))}
          </dl>
          {query.data.items.length ? (
            <div className="divide-y">
              {query.data.items.map((task) => {
                const due = homeDueState(task.due_date, query.data.today);
                const Icon = due === "overdue" ? AlertTriangleIcon : CircleIcon;
                return (
                  <Link
                    key={task.id}
                    href={homeTaskHref(task)}
                    className="flex items-start gap-3 rounded-sm px-1 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        due === "overdue"
                          ? "text-[var(--status-warning-fg)]"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm @min-[48rem]/home:grid-cols-[minmax(8rem,1fr)_minmax(0,3fr)_7rem_6rem]">
                      <span
                        className="col-span-2 truncate text-xs text-muted-foreground @min-[48rem]/home:col-span-1 @min-[48rem]/home:text-sm"
                        title={task.project_name}
                      >
                        {task.project_name}
                      </span>
                      <span className="col-span-2 font-medium break-words @min-[48rem]/home:col-span-1">
                        {task.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs @min-[48rem]/home:text-sm",
                          due === "overdue"
                            ? "text-[var(--status-warning-fg)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {due === "overdue"
                          ? "期限超過 "
                          : due === "today"
                            ? "今日まで "
                            : ""}
                        {task.due_date ? (
                          <time dateTime={task.due_date}>
                            {formatCalendarDate(task.due_date)}
                          </time>
                        ) : (
                          "期限なし"
                        )}
                      </span>
                      <span className="text-right text-xs text-muted-foreground @min-[48rem]/home:text-left @min-[48rem]/home:text-sm">
                        {getTaskStatusLabel(task.status)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              message="自分に割り当てられた未完了タスクはありません。"
              className="py-4"
            />
          )}
          {query.data.summary.total > query.data.items.length ? (
            <p className="text-xs text-muted-foreground">
              未完了{query.data.summary.total}件のうち、期限の近い
              {query.data.items.length}件を表示しています。
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
