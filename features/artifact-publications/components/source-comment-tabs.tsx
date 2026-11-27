"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayDate } from "@/features/artifact-releases/lib/display";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { ListPublicationsProjectsProjectIdArtifactPublicationsGetSourceKind } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { useFreshShared } from "../hooks/use-fresh-shared";
import { listPublications } from "../lib/api";
import { PublicationComments } from "./publication-comments";

type Source = {
  projectId: number;
  sourceKind: ListPublicationsProjectsProjectIdArtifactPublicationsGetSourceKind;
  sourceId: number;
};

export function SourceCommentTabs({
  projectId,
  sourceKind,
  sourceId,
  internalRequest = 0,
  className,
  action,
  children,
}: Source & {
  internalRequest?: number;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const role = currentProjectRole?.role?.key;
  const canOpenShared =
    user?.user_type === "internal" &&
    !user.demo &&
    (role === "project_admin" || role === "manager");
  const [selection, setSelection] = useState({
    tab: "internal",
    internalRequest,
  });
  const [openedShared, setOpenedShared] = useState(false);
  const active =
    canOpenShared && selection.internalRequest === internalRequest
      ? selection.tab
      : "internal";

  return (
    <Tabs
      value={active}
      activationMode="manual"
      onValueChange={(tab) => {
        if (tab === "shared") setOpenedShared(true);
        setSelection({ tab, internalRequest });
      }}
      className={cn("min-h-0 min-w-0", className)}
    >
      {canOpenShared || action ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          {canOpenShared ? (
            <TabsList aria-label="コメントの範囲">
              <TabsTrigger value="internal">内部コメント</TabsTrigger>
              <TabsTrigger value="shared">共有コメント</TabsTrigger>
            </TabsList>
          ) : null}
          {action ? <div className="ms-auto">{action}</div> : null}
        </div>
      ) : null}
      <TabsContent
        value="internal"
        forceMount
        hidden={active !== "internal"}
        className="min-h-0 min-w-0 data-[state=inactive]:hidden"
      >
        {children}
      </TabsContent>
      {canOpenShared ? (
        <TabsContent
          value="shared"
          forceMount
          hidden={active !== "shared"}
          className="min-h-0 min-w-0 overflow-y-auto overscroll-contain data-[state=inactive]:hidden"
        >
          {openedShared ? (
            <FixedVersionComments
              key={`${projectId}:${sourceKind}:${sourceId}`}
              projectId={projectId}
              sourceKind={sourceKind}
              sourceId={sourceId}
            />
          ) : null}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

function FixedVersionComments({ projectId, sourceKind, sourceId }: Source) {
  const selectId = useId();
  const content = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [publicationId, setPublicationId] = useState("");
  const mask = useCallback((hidden: boolean) => {
    if (content.current) content.current.hidden = hidden;
  }, []);
  const load = useCallback(
    (signal: AbortSignal) =>
      listPublications(
        projectId,
        {
          source_kind: sourceKind,
          source_id: sourceId,
          state: ["published", "withdrawn"],
          page,
          page_size: 20,
        },
        { signal },
      ),
    [projectId, sourceKind, sourceId, page],
  );
  const { value, error, refresh } = useFreshShared(
    `${projectId}:${sourceKind}:${sourceId}:${page}`,
    load,
    mask,
  );
  if (error) {
    return (
      <DataLoadError
        resourceName="共有した固定版"
        onRetry={() => void refresh()}
      />
    );
  }
  if (!value) {
    return (
      <div role="status">
        <span className="sr-only">共有した固定版を読み込み中</span>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (!value.total) {
    return <EmptyState message="この資料で共有した固定版はありません。" />;
  }
  const selected = value.items.find((item) => item.id === publicationId);
  return (
    <div ref={content} className="grid min-w-0 gap-3 [&[hidden]]:hidden">
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor={selectId} className="font-medium">
          コメント先の固定版
        </label>
        <select
          id={selectId}
          className="h-9 w-full min-w-0 truncate rounded-md border border-input bg-background px-2 focus-visible:ring-2 focus-visible:ring-ring"
          value={selected?.id ?? ""}
          onChange={(event) => setPublicationId(event.target.value)}
        >
          <option value="">共有した固定版を選択</option>
          {value.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.state === "withdrawn" ? "公開停止" : "公開中"} · 保存{" "}
              {displayDate(item.created_at)} · {item.title}
            </option>
          ))}
        </select>
      </div>
      {value.total > value.page_size ? (
        <DataPagination
          page={value.page}
          pageSize={value.page_size}
          total={value.total}
          currentCount={value.items.length}
          onPageChange={(nextPage) => {
            setPublicationId("");
            setPage(nextPage);
          }}
        />
      ) : null}
      {selected ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-muted-foreground">
              固定日時 {formatDateTime(selected.captured_at)}
            </span>
            <Link
              href={`/projects/joined/${projectId}/artifact-publications?publication=${selected.id}&view=discussion#shared-comments`}
              prefetch={false}
              className="w-fit underline underline-offset-4"
            >
              固定本文を開く
            </Link>
          </div>
          <PublicationComments
            key={selected.id}
            projectId={projectId}
            publicationId={selected.id}
          />
        </>
      ) : null}
    </div>
  );
}
