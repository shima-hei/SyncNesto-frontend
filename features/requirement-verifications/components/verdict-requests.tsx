"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { listRequests } from "../lib/verdict-api";
import { verdictHref, verdictLabels } from "../lib/verdict";
import { VerdictComposer } from "./verdict-composer";

export function VerdictRequests({
  projectId,
  requirementId,
  planId,
  version,
  dirty,
  from,
  rowId,
}: {
  projectId: number;
  requirementId: number;
  planId: string;
  version: number;
  dirty: boolean;
  from: string;
  rowId: string | null;
}) {
  const { user } = useAuth(),
    { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const scope = [
    "verification-verdicts",
    tenant?.id,
    user?.id,
    projectId,
    planId,
  ];
  const query = useInfiniteQuery({
    queryKey: [...scope, "requests", requirementId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listRequests(projectId, {
        requirement_id: requirementId,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const page = query.data?.pages[0],
    items = query.data?.pages.flatMap((p) => p.items ?? []) ?? [];
  const parents = new Set(items.map((i) => i.previous_request_id)),
    terminal = items.filter((i) => !parents.has(i.id));
  const canCreate =
    !query.hasNextPage &&
    (items.length === 0 ||
      (terminal.length === 1 && terminal[0].status !== "requested"));
  if (page?.state === "disabled") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>5. 最終判断</CardTitle>
        <CardDescription>
          要件の固定内容に対して、指定した担当が合格・不合格・対象外を判断します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <Skeleton className="h-16" aria-label="判定依頼を読込中" />
        ) : query.isError ? (
          <DataLoadError
            resourceName="最終判断"
            onRetry={() => void query.refetch()}
          />
        ) : page?.state === "restricted" ? (
          <Alert>
            <AlertDescription>
              判断の閲覧に必要な権限がありません。
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {page?.can_prepare ? (
                <Button
                  disabled={dirty || !canCreate || query.isFetching}
                  onClick={() => setOpen(true)}
                >
                  {items.length ? "見直しを依頼" : "最終判断を依頼"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                更新
              </Button>
            </div>
            {dirty ? (
              <p className="text-sm text-muted-foreground">
                確認表を保存してから依頼してください。
              </p>
            ) : null}
            {!items.length ? (
              <p className="text-sm text-muted-foreground">
                まだ判定を依頼していません。
              </p>
            ) : (
              items.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{verdictLabels[r.status]}</Badge>
                    <span>
                      {r.result
                        ? `保存した判断：${verdictLabels[r.result]} · `
                        : ""}
                      確認表 {r.plan_version}版 · {r.judge_name}
                      {r.judge_id === user?.id ? "（あなた）" : ""}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={verdictHref(projectId, r.id, from, rowId)}>
                      判断の詳細
                    </Link>
                  </Button>
                </div>
              ))
            )}
            {query.hasNextPage ? (
              <Button
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                過去の依頼をさらに表示
              </Button>
            ) : null}
          </>
        )}
        {open ? (
          <VerdictComposer
            projectId={projectId}
            planId={planId}
            version={version}
            scope={scope}
            previous={terminal[0]}
            from={from}
            rowId={rowId}
            onClose={() => {
              setOpen(false);
              void query.refetch();
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
