"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import {
  REQUIREMENT_STATUS_OPTIONS,
  getRequirementStatusLabel,
} from "@/features/requirements/constants/requirement-options";
import { readRequirementTraceProjectsProjectIdRequirementTraceGet as readTrace } from "@/lib/api/generated/requirement-trace/requirement-trace";
import { listRequirementDocumentsProjectsProjectIdRequirementDocumentsGet as readDocuments } from "@/lib/api/generated/requirements/requirements";
import type { TraceFacet } from "@/lib/api/generated/model";
import {
  readTraceParams,
  readScheduleParams,
  safeOverviewReturn,
} from "@/lib/navigation/overview-origin";
import { RequirementTracePanel } from "./requirement-trace-panel";
import {
  RequirementAgreements,
  AgreementRefresh,
} from "./requirement-agreements";
import { useRequirementAgreements } from "@/features/projects/hooks/use-requirement-agreements";
import {
  RequirementScheduleView,
  useScheduleAvailability,
} from "./requirement-schedule";

export function RequirementTrace({ projectId }: { projectId: number }) {
  const params = useSearchParams();
  const state = readTraceParams(params);
  const scheduleRequested = readScheduleParams(params).view === "schedule";
  const schedule = useScheduleAvailability(projectId);
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsPage, setDocumentsPage] = useState(1);
  const focusRequirement = useRef(state.selected);
  const filters = {
    page: state.page,
    page_size: 20,
    document_id: state.document ?? undefined,
    q: state.q || undefined,
    status: state.status || undefined,
  };
  const query = useQuery({
    queryKey: ["requirement-trace", tenant?.id, user?.id, projectId, filters],
    queryFn: () => readTrace(projectId, filters),
    enabled: Boolean(
      user && tenant && projectId > 0 && (!scheduleRequested || state.selected),
    ),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const documents = useQuery({
    queryKey: [
      "trace-documents",
      tenant?.id,
      user?.id,
      projectId,
      documentsPage,
    ],
    queryFn: () =>
      readDocuments(projectId, { page: documentsPage, page_size: 20 }),
    enabled:
      documentsOpen &&
      (query.data?.state === "ready" || Boolean(schedule.data?.enabled)),
    retry: false,
  });
  const agreements = useRequirementAgreements(
    projectId,
    query.data?.state === "ready" && !query.isError && !scheduleRequested
      ? (query.data.items ?? []).map((r) => r.id)
      : [],
  );
  const change = (changes: Record<string, string | null>, push = false) => {
    const url = new URL(window.location.href);
    if (
      ["traceDocument", "traceQ", "traceStatus"].some((key) => key in changes)
    ) {
      url.searchParams.delete("schedulePage");
      url.searchParams.delete("commonPage");
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (push) window.history.pushState({ tracePanelOpened: true }, "", href);
    else
      window.history.replaceState(
        { tracePanelOpened: Boolean(window.history.state?.tracePanelOpened) },
        "",
        href,
      );
  };
  const close = () => {
    if (window.history.state?.tracePanelOpened) window.history.back();
    else change({ selectedRequirement: null });
  };
  if (query.isPending && !scheduleRequested && !schedule.data?.enabled)
    return <Skeleton className="h-36" aria-label="要件の関連を読込中" />;
  if (query.isError && !scheduleRequested && !schedule.data?.enabled)
    return (
      <DataLoadError
        resourceName="要件と関連"
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  if (!data?.enabled && !scheduleRequested && !schedule.data?.enabled)
    return null;
  if (data?.state === "restricted" && !scheduleRequested)
    return (
      <Card>
        <CardHeader>
          <CardTitle>要件から次の作業を確認する</CardTitle>
          <CardDescription>要件を閲覧する権限が必要です。</CardDescription>
        </CardHeader>
      </Card>
    );
  const items = data?.items ?? [];
  const selected = items.find((row) => row.id === state.selected);
  const current = `/projects/joined/${projectId}${params.size ? `?${params}` : ""}`;
  const returnTo = safeOverviewReturn(current, projectId)!;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {scheduleRequested
            ? "要件から予定を確認する"
            : "要件から次の作業を確認する"}
        </CardTitle>
        <CardDescription>
          {scheduleRequested
            ? "タスクの予定を参照します。日程変更はガントで行います。"
            : "何を満たすかを選び、設計・作業・テストと判断の根拠をたどれます。文書の絞り込みは案件の共通ゴールを変更しません。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {schedule.data?.enabled || scheduleRequested ? (
          <ToggleGroup
            type="single"
            variant="outline"
            value={scheduleRequested ? "schedule" : "requirements"}
            onValueChange={(value) => {
              if (value)
                change({
                  overviewView: value === "schedule" ? "schedule" : null,
                });
            }}
            aria-label="概要の表示"
          >
            <ToggleGroupItem value="requirements">要件ビュー</ToggleGroupItem>
            <ToggleGroupItem value="schedule">日程ビュー</ToggleGroupItem>
          </ToggleGroup>
        ) : null}
        <form
          key={state.q}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            change({
              traceQ: String(form.get("q") ?? "").trim(),
              tracePage: null,
            });
          }}
        >
          <FieldGroup className="flex-1 sm:flex-row sm:items-end">
            <Field className="flex-1">
              <FieldLabel htmlFor="trace-search">要件を検索</FieldLabel>
              <Input
                id="trace-search"
                name="q"
                maxLength={200}
                defaultValue={state.q}
                placeholder="要件コード・名前・本文"
              />
            </Field>
            <Field className="sm:max-w-44">
              <FieldLabel htmlFor="trace-status">編集状態</FieldLabel>
              <Select
                value={state.status || "all"}
                onValueChange={(value) =>
                  change({
                    traceStatus: value === "all" ? null : value,
                    tracePage: null,
                  })
                }
              >
                <SelectTrigger id="trace-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">すべて</SelectItem>
                    {REQUIREMENT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <Button type="submit" variant="outline">
            検索
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {!scheduleRequested && items.length ? (
            <AgreementRefresh
              query={agreements}
              onRefresh={() => void query.refetch()}
            />
          ) : null}
          <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {state.document ? "文書の絞り込みを変更" : "文書を絞り込む"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>表示する文書を絞り込む</DialogTitle>
                <DialogDescription>
                  あなたの一覧だけの条件です。全員の概要に使う共通出典は変更しません。
                </DialogDescription>
              </DialogHeader>
              {documents.isError ? (
                <DataLoadError
                  resourceName="文書候補"
                  onRetry={() => void documents.refetch()}
                />
              ) : documents.isPending ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="trace-document">要件定義書</FieldLabel>
                    <Select
                      value={state.document ? String(state.document) : "all"}
                      onValueChange={(value) => {
                        change({
                          traceDocument: value === "all" ? null : value,
                          tracePage: null,
                        });
                        setDocumentsOpen(false);
                      }}
                    >
                      <SelectTrigger id="trace-document">
                        <SelectValue placeholder="文書を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">すべての文書</SelectItem>
                          {state.document &&
                          !documents.data?.items.some(
                            (d) => d.id === state.document,
                          ) ? (
                            <SelectItem value={String(state.document)}>
                              選択中の文書
                            </SelectItem>
                          ) : null}
                          {documents.data?.items.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.document_code} · {d.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={documentsPage === 1 || documents.isFetching}
                      onClick={() => setDocumentsPage((p) => p - 1)}
                    >
                      前へ
                    </Button>
                    <span className="text-sm">{documentsPage}ページ</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !documents.data ||
                        documentsPage * 20 >= documents.data.total ||
                        documents.isFetching
                      }
                      onClick={() => setDocumentsPage((p) => p + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
          {state.document ? (
            <Badge variant="secondary">文書を指定中</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">全文書</span>
          )}
          {state.q || state.document || state.status ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                change({
                  traceQ: null,
                  traceDocument: null,
                  traceStatus: null,
                  tracePage: null,
                })
              }
            >
              絞り込みを解除
            </Button>
          ) : null}
        </div>
        {scheduleRequested ? (
          <RequirementScheduleView projectId={projectId} change={change} />
        ) : query.isPending ? (
          <Skeleton className="h-36" aria-label="要件の関連を読込中" />
        ) : query.isError ? (
          <DataLoadError
            resourceName="要件と関連"
            onRetry={() => void query.refetch()}
          />
        ) : !data?.enabled ? (
          <p>要件ビューは現在無効です。</p>
        ) : items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>表示できる要件はありません</EmptyTitle>
              <EmptyDescription>
                絞り込みを解除するか、要件定義書で登録状況を確認してください。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableCaption>
              合意ありは指定された人の判断です。関係者全員の合意やテストの合格を意味しません。編集状態と現在内容への判断は別々に確認できます。
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>何を満たすか</TableHead>
                <TableHead>編集状態</TableHead>
                <TableHead>現在の内容への合意</TableHead>
                <TableHead>設計</TableHead>
                <TableHead>関連作業</TableHead>
                <TableHead>テスト項目</TableHead>
                <TableHead>次の確認</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    state.selected === row.id ? "selected" : undefined
                  }
                >
                  <TableCell className="min-w-52 whitespace-normal">
                    <span className="block text-xs text-muted-foreground">
                      {row.document_code} / {row.requirement_code}
                    </span>
                    <span className="font-medium break-words">{row.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getRequirementStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <RequirementAgreements
                      query={agreements}
                      requirementId={row.id}
                      version={row.version}
                      projectId={projectId}
                    />
                  </TableCell>
                  <TableCell>
                    <FacetCount facet={row.designs} />
                  </TableCell>
                  <TableCell>
                    <FacetCount facet={row.tasks} />
                  </TableCell>
                  <TableCell>
                    <FacetCount facet={row.test_items} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      data-trace-requirement={row.id}
                      onClick={() => {
                        focusRequirement.current = row.id;
                        change({ selectedRequirement: String(row.id) }, true);
                      }}
                    >
                      関連を見る
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Sheet
          open={Boolean(state.selected) && !scheduleRequested}
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <SheetContent
            className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLButtonElement>(
                    `[data-trace-requirement="${focusRequirement.current}"]`,
                  )
                  ?.focus(),
              );
            }}
          >
            <SheetHeader>
              <SheetTitle>要件と次の確認先</SheetTitle>
              <SheetDescription>
                編集はそれぞれの正本の画面で行います。関連件数から達成を自動判定しません。
              </SheetDescription>
            </SheetHeader>
            {state.selected ? (
              <RequirementTracePanel
                projectId={projectId}
                requirementId={state.selected}
                version={selected?.version}
                returnTo={returnTo}
                outsidePage={!selected}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      </CardContent>
      {!scheduleRequested && data?.enabled ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {data.total}件中 {items.length}件 / {state.page}ページ
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={state.page === 1 || query.isFetching}
              onClick={() => change({ tracePage: String(state.page - 1) })}
            >
              前のページ
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                state.page * 20 >= (data.total ?? 0) || query.isFetching
              }
              onClick={() => change({ tracePage: String(state.page + 1) })}
            >
              次のページ
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function FacetCount({ facet }: { facet: TraceFacet }) {
  return (
    <span className="text-sm">
      {facet.state === "restricted"
        ? "閲覧制限"
        : facet.count === 0
          ? "関連なし"
          : `${facet.count}件`}
    </span>
  );
}
