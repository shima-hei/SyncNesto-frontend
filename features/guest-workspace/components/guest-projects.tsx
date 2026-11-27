"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SharedDecisions,
  SharedPublicationsList,
} from "@/features/artifact-publications/components/shared-pages";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { SharedDecisionLists } from "@/features/artifact-publications/components/shared-decision-lists";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import {
  getGuestProjectSharedProjectsParticipationIdGet as getProject,
  listGuestProjectsSharedProjectsGet as listProjects,
} from "@/lib/api/generated/shared-projects/shared-projects";
import { formatDate } from "@/lib/format/date";
import { GuestComments } from "./guest-comments";
import { GuestActivity } from "./guest-activity";

export function GuestHome() {
  return (
    <>
      <PageHeader title="ホーム" />
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">対応が必要な確認・承認</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/shared/decisions" prefetch={false}>
              すべての依頼
            </Link>
          </Button>
        </div>
        <SharedDecisionLists compact returnTo="/shared" />
      </section>
      <GuestActivity unreadComments />
      <section className="grid gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">参加案件</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/shared/projects" prefetch={false}>
              すべての案件
            </Link>
          </Button>
        </div>
        <GuestProjects preview />
      </section>
      <section className="grid gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">最近共有された資料</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/shared/publications" prefetch={false}>
              すべての共有資料
            </Link>
          </Button>
        </div>
        <SharedPublicationsList preview />
      </section>
      <section className="grid gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">最近の共有コメント</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/shared/comments" prefetch={false}>
              すべてのコメント
            </Link>
          </Button>
        </div>
        <GuestComments preview />
      </section>
    </>
  );
}

export function GuestProjects({ preview = false }: { preview?: boolean }) {
  const [page, setPage] = useState(1);
  const pageSize = preview ? 4 : 20;
  const load = useCallback(
    (signal: AbortSignal) =>
      listProjects({ page, page_size: pageSize }, { signal }),
    [page, pageSize],
  );
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const { value, error, refresh } = useFreshShared(
    `guest-projects:${page}:${pageSize}`,
    load,
    mask,
  );
  const expiresAt = value?.items.reduce<number | undefined>(
    (earliest, item) =>
      Math.min(earliest ?? Infinity, Date.parse(item.expires_at)),
    undefined,
  );
  useExpiryRefresh(expiresAt, refresh);
  return (
    <>
      {!preview && <PageHeader title="参加案件" />}
      <div ref={root} className="min-w-0">
        {error ? (
          <DataLoadError
            resourceName="参加案件"
            onRetry={() => void refresh()}
          />
        ) : !value ? (
          <Skeleton className="h-16" />
        ) : !value.items.length ? (
          <EmptyState message="表示できる参加案件はありません" />
        ) : (
          <ul className="divide-y border-y">
            {value.items.map((item) => (
              <li key={item.participation_id}>
                <Link
                  href={`/shared/projects/${item.participation_id}`}
                  prefetch={false}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm p-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Folder
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="break-words text-sm font-medium">
                    {item.name || "公開名未設定の案件"}
                  </span>
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!preview && value && value.total > pageSize ? (
        <DataPagination
          page={page}
          total={value.total}
          pageSize={pageSize}
          currentCount={value.items.length}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}

const projectTabs = [
  "overview",
  "publications",
  "decisions",
  "comments",
] as const;

export function GuestProject({ participationId }: { participationId: string }) {
  const load = useCallback(
    (signal: AbortSignal) => getProject(participationId, { signal }),
    [participationId],
  );
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const { value, error, refresh } = useFreshShared(participationId, load, mask);
  useExpiryRefresh(value ? Date.parse(value.expires_at) : undefined, refresh);
  const [tab, setTab] = useUrlTabState({
    values: projectTabs,
    defaultValue: "overview",
  });
  return (
    <>
      <Link
        href="/shared/projects"
        prefetch={false}
        className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        参加案件に戻る
      </Link>
      <div ref={root} className="min-w-0">
        {error ? (
          <DataLoadError
            resourceName="公開用概要"
            onRetry={() => void refresh()}
          />
        ) : !value ? (
          <Skeleton className="h-44" />
        ) : (
          <div className="grid gap-4">
            <PageHeader title={value.name || "公開名未設定の案件"} />
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList aria-label="参加案件">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="publications">共有資料</TabsTrigger>
                <TabsTrigger value="decisions">確認・承認</TabsTrigger>
                <TabsTrigger value="comments">コメント</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="grid gap-5 py-4">
                <section className="grid gap-3">
                  <h2 className="text-base font-semibold">
                    プロジェクトについて
                  </h2>
                  <p className="max-w-prose text-sm leading-6 whitespace-pre-wrap break-words">
                    {value.description || "公開用の説明は設定されていません。"}
                  </p>
                  {(value.starts_on || value.ends_on || value.contact) && (
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      {(value.starts_on || value.ends_on) && (
                        <div>
                          <dt className="text-muted-foreground">期間</dt>
                          <dd>
                            {value.starts_on
                              ? formatDate(value.starts_on)
                              : "未設定"}{" "}
                            〜{" "}
                            {value.ends_on
                              ? formatDate(value.ends_on)
                              : "未設定"}
                          </dd>
                        </div>
                      )}
                      {value.contact && (
                        <div>
                          <dt className="text-muted-foreground">窓口担当者</dt>
                          <dd className="break-words">{value.contact}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </section>
                {value.announcement && (
                  <section className="grid gap-2 border-t pt-4">
                    <h2 className="text-base font-semibold">お知らせ</h2>
                    <p className="max-w-prose text-sm leading-6 whitespace-pre-wrap break-words">
                      {value.announcement}
                    </p>
                  </section>
                )}
              </TabsContent>
              <TabsContent value="comments" className="grid gap-4 py-4">
                <GuestComments participationId={participationId} />
              </TabsContent>
              <TabsContent value="decisions" className="grid gap-4 py-4">
                <SharedDecisions participationId={participationId} />
              </TabsContent>
              <TabsContent value="publications" className="grid gap-4 py-4">
                <SharedPublicationsList
                  participationId={participationId}
                  embedded
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}

function useExpiryRefresh(
  expiresAt: number | undefined,
  refresh: () => Promise<void>,
) {
  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expiresAt - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt, refresh]);
}
