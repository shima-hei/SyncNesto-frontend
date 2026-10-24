"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { readRequirementScheduleProjectsProjectIdRequirementScheduleGet as readSchedule } from "@/lib/api/generated/requirement-schedule/requirement-schedule";
import { readMilestoneMilestonesMilestoneIdGet as readMilestone } from "@/lib/api/generated/tasks/tasks";
import type { ScheduleTask } from "@/lib/api/generated/model";
import {
  readScheduleParams,
  readTraceParams,
  safeOverviewReturn,
  withOverviewOrigin,
} from "@/lib/navigation/overview-origin";
import {
  schedulePlacement,
  scheduleWeeks,
  shiftScheduleWindow,
} from "../../lib/requirement-schedule";
import {
  getTaskStatusLabel,
  MILESTONE_STATUS_OPTIONS,
} from "@/features/tasks/constants/task-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";

type Change = (values: Record<string, string | null>) => void;

export function useScheduleAvailability(projectId: number) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["schedule-availability", tenant?.id, user?.id, projectId],
    queryFn: ({ signal }) =>
      readSchedule(projectId, { metadata_only: true }, { signal }),
    enabled: Boolean(user && !user.demo && tenant && projectId > 0),
    retry: false,
    staleTime: 0,
  });
}

export function RequirementScheduleView({
  projectId,
  change,
}: {
  projectId: number;
  change: Change;
}) {
  const params = useSearchParams();
  const trace = readTraceParams(params);
  const state = readScheduleParams(params);
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [milestone, setMilestone] = useState<number | null>(null);
  const filters = {
    page: state.page,
    common_page: state.commonPage,
    document_id: trace.document ?? undefined,
    q: trace.q || undefined,
    status: trace.status || undefined,
    window_start: state.start ?? undefined,
    window_end: state.end ?? undefined,
  };
  const query = useQuery({
    queryKey: [
      "requirement-schedule",
      tenant?.id,
      user?.id,
      projectId,
      filters,
    ],
    queryFn: ({ signal }) => readSchedule(projectId, filters, { signal }),
    enabled: Boolean(user && !user.demo && tenant && projectId > 0),
    retry: false,
    refetchOnWindowFocus: true,
  });
  const visibleMilestone = query.data?.milestones?.some(
    (m) => m.id === milestone,
  );
  const detail = useQuery({
    queryKey: [
      "schedule-milestone",
      tenant?.id,
      user?.id,
      projectId,
      milestone,
    ],
    queryFn: ({ signal }) => readMilestone(milestone!, { signal }),
    enabled: Boolean(milestone && visibleMilestone && !query.isError),
    retry: false,
    staleTime: 0,
  });
  if (query.isPending)
    return <Skeleton className="h-40" aria-label="日程を読み込み中" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="要件の日程（閲覧権限・表示期間も確認してください）"
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  if (!data?.enabled || !data.window_start || !data.window_end || !data.summary)
    return (
      <Alert>
        <AlertTitle>日程ビューは無効です</AlertTitle>
        <AlertDescription>要件ビューを利用してください。</AlertDescription>
      </Alert>
    );
  const from = data.window_start,
    to = data.window_end;
  const weeks = scheduleWeeks(from, to);
  const origin = safeOverviewReturn(
    `/projects/joined/${projectId}?${params}`,
    projectId,
  );
  const link = (path: string) =>
    withOverviewOrigin(
      `/projects/joined/${projectId}/${path}`,
      projectId,
      origin,
    );
  const gantt = (id?: number) =>
    link(`tasks?tab=gantt${id ? `&ganttRequirementId=${id}` : ""}`);
  const move = (direction: number) => {
    const next = shiftScheduleWindow(from, to, direction);
    if (next) change({ scheduleStart: next.start, scheduleEnd: next.end });
  };
  const row = (task: ScheduleTask) => {
    const placement = schedulePlacement(
      task.start_date,
      task.due_date,
      from,
      to,
    );
    return (
      <TableRow key={task.id}>
        <TableCell className="min-w-56 max-w-80 whitespace-normal break-words">
          <Link
            className="font-medium underline underline-offset-4"
            href={link(`tasks/${task.id}`)}
          >
            {task.title}
          </Link>
          <p className="text-xs text-muted-foreground">{task.task_code}</p>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {task.start_date ?? "開始未設定"}
          <br />
          {task.due_date ?? "終了未設定"}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{getTaskStatusLabel(task.status)}</Badge>
          <p className="text-xs text-muted-foreground">
            タスク進捗 {task.progress_percent}%
          </p>
        </TableCell>
        <TableCell colSpan={weeks.length} className="p-1">
          <div
            className="grid min-w-96 items-center gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(3rem, 1fr))`,
            }}
            aria-label={`${task.title}：${placement.label}`}
          >
            {placement.column ? (
              <span
                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                style={{ gridColumn: placement.column }}
              >
                予定
              </span>
            ) : (
              <span className="col-span-full text-sm text-muted-foreground">
                {placement.label}
              </span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {from} 〜 {to}
          </p>
          <p className="text-xs text-muted-foreground">
            週単位・集計基準日 {data.basis_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!shiftScheduleWindow(from, to, -1)}
            onClick={() => move(-1)}
          >
            前の期間
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => change({ scheduleStart: null, scheduleEnd: null })}
          >
            基準日の期間
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!shiftScheduleWindow(from, to, 1)}
            onClick={() => move(1)}
          >
            次の期間
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={gantt()}>ガントで日程を編集</Link>
          </Button>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2"
        aria-label="全ページの一意タスク件数"
      >
        <Badge variant="secondary">
          {trace.q || trace.document || trace.status
            ? "要件条件内"
            : "案件全体"}{" "}
          {data.summary.total}タスク
        </Badge>
        <Badge variant="outline">期間未確定 {data.summary.unplanned}</Badge>
        <Badge variant="outline">期限超過 {data.summary.overdue}</Badge>
        <span className="text-xs text-muted-foreground">
          共有タスクは1件で集計・要件の合否とは別です
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        要件別の予定を表示しています。工程別の表示は今後対応します。
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>要件・タスク</TableHead>
            <TableHead>開始・終了予定</TableHead>
            <TableHead>状態</TableHead>
            {weeks.map((w) => (
              <TableHead key={w} className="min-w-12">
                {w.slice(5).replace("-", "/")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data.groups ?? []).map((group) => (
            <Fragment key={group.id}>
              <TableRow>
                <TableHead
                  colSpan={weeks.length + 3}
                  className="whitespace-normal bg-muted py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="underline underline-offset-4"
                      href={link(
                        `requirements/${group.document_id}/items/${group.id}`,
                      )}
                    >
                      {group.requirement_code} {group.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      関連 {group.task_count}タスク
                    </span>
                    {group.has_more ? (
                      <Link
                        className="text-sm underline"
                        href={gantt(group.id)}
                      >
                        全件をガントで確認
                      </Link>
                    ) : null}
                  </div>
                </TableHead>
              </TableRow>
              {group.tasks.length ? (
                group.tasks.map(row)
              ) : (
                <TableRow>
                  <TableCell colSpan={weeks.length + 3}>
                    関連作業なし。作業が必要かどうかは未判断です。
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
          {!data.groups?.length ? (
            <TableRow>
              <TableCell colSpan={weeks.length + 3}>
                {(data.total ?? 0) > 0
                  ? "このページに要件はありません。前のページから確認してください。"
                  : "条件に一致する要件はありません。"}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <Pager
        page={data.page ?? 1}
        total={data.total ?? 0}
        pending={query.isFetching}
        change={(p) => change({ schedulePage: String(p) })}
        label="要件"
      />
      <section className="flex flex-col gap-2" aria-label="要件未関連の作業">
        <h3 className="font-medium">要件未関連の作業</h3>
        {data.common_state === "outside_requirement_filter" ? (
          <p className="text-sm text-muted-foreground">
            要件条件の対象外です。条件を解除すると、共通作業などを確認できます。
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              共通作業などを含みます。日程未設定の作業も表示します。
            </p>
            {data.common_tasks?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タスク</TableHead>
                    <TableHead>開始・終了予定</TableHead>
                    <TableHead>状態</TableHead>
                    {weeks.map((w) => (
                      <TableHead key={w}>{w.slice(5)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>{data.common_tasks.map(row)}</TableBody>
              </Table>
            ) : (
              <p className="text-sm">
                {(data.common_total ?? 0) > 0
                  ? "このページに未関連の作業はありません。前のページから確認してください。"
                  : "要件未関連の作業はありません。"}
              </p>
            )}
            <Pager
              page={data.common_page ?? 1}
              total={data.common_total ?? 0}
              pending={query.isFetching}
              change={(p) => change({ commonPage: String(p) })}
              label="未関連作業"
            />
          </>
        )}
      </section>
      <section className="flex flex-col gap-2" aria-label="案件全体の節目">
        <h3 className="font-medium">案件全体の節目</h3>
        <p className="text-sm text-muted-foreground">
          表示期間内の節目です。要件の絞り込みとは別です。
        </p>
        {data.milestones?.length ? (
          <ul className="flex flex-col gap-2">
            {data.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span>{m.target_date}</span>
                <Button variant="link" onClick={() => setMilestone(m.id)}>
                  {m.title}
                </Button>
                <Badge variant="outline">
                  {MILESTONE_STATUS_OPTIONS.find((o) => o.value === m.status)
                    ?.label ?? m.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">この期間の節目はありません。</p>
        )}
        {data.milestones_has_more ? (
          <Link className="text-sm underline" href={gantt()}>
            残りの節目をガントで確認
          </Link>
        ) : null}
      </section>
      <Dialog
        open={milestone !== null}
        onOpenChange={(open) => {
          if (!open) setMilestone(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>マイルストーン</DialogTitle>
            <DialogDescription>
              保存済みの節目を参照します。変更は既存のタスク管理から行います。
            </DialogDescription>
          </DialogHeader>
          {!visibleMilestone ||
          detail.error ||
          (detail.data && detail.data.project_id !== projectId) ? (
            <p role="alert">この案件の節目を確認できません。</p>
          ) : detail.isPending ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">{detail.data?.title}</h3>
              <p>{detail.data?.target_date}</p>
              <p className="whitespace-pre-wrap break-words">
                {detail.data?.description || "説明はありません。"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pager({
  page,
  total,
  pending,
  change,
  label,
}: {
  page: number;
  total: number;
  pending: boolean;
  change: (page: number) => void;
  label: string;
}) {
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2"
      aria-label={`${label}のページ`}
    >
      <p className="text-sm text-muted-foreground">
        {label} {total}件 / {page}ページ
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || pending}
          onClick={() => change(page - 1)}
        >
          前へ
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page * 20 >= total || pending}
          onClick={() => change(page + 1)}
        >
          次へ
        </Button>
      </div>
    </nav>
  );
}
