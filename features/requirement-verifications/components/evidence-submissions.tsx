"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { formatDateTime } from "@/lib/format/date";
import type { VerificationRow } from "@/lib/api/generated/model";
import { EvidenceComposer } from "./evidence-composer";
import { EvidenceSetDetails } from "./evidence-set-details";
import { listEvidenceSets } from "../lib/evidence-api";
import { evidenceStates } from "../lib/evidence";

export function EvidenceSubmissions({
  projectId,
  planId,
  version,
  rows,
  selected,
  dirty,
}: {
  projectId: number;
  planId: string;
  version: number;
  rows: VerificationRow[];
  selected: string | null;
  dirty: boolean;
}) {
  const { user } = useAuth(),
    { tenant } = useTenant();
  const client = useQueryClient(),
    pathname = usePathname(),
    params = useSearchParams();
  const [allVersions, setAllVersions] = useState(false);
  const [composer, setComposer] = useState<{
    version: number;
    rows: VerificationRow[];
    selected: string | null;
  } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const scope = [
    "verification-submissions",
    tenant?.id,
    user?.id,
    projectId,
    planId,
  ];
  const query = useInfiniteQuery({
    queryKey: [...scope, "list", version, allVersions],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listEvidenceSets(projectId, planId, {
        plan_version: allVersions ? undefined : version,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const page = query.data?.pages[0],
    items = query.data?.pages.flatMap((p) => p.items ?? []) ?? [];
  if (page?.state === "disabled") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>4. 証拠の提出と保全</CardTitle>
        <CardDescription>
          固定した要件と確認表の版に、実際の確認結果と根拠を残します。次の最終判断で使う資料です。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isError ? (
          <DataLoadError
            resourceName="証拠の提出・保全"
            onRetry={() => void query.refetch()}
          />
        ) : query.isPending ? (
          <p>読込中…</p>
        ) : page?.state === "restricted" ? (
          <Alert>
            <AlertDescription>
              閲覧に必要な分野の権限が不足しています。証拠0件とは判断していません。
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ToggleGroup
                type="single"
                variant="outline"
                value={allVersions ? "all" : "current"}
                onValueChange={(v) => {
                  if (v) setAllVersions(v === "all");
                }}
              >
                <ToggleGroupItem value="current">この確認表版</ToggleGroupItem>
                <ToggleGroupItem value="all">すべての版</ToggleGroupItem>
              </ToggleGroup>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  一覧を更新
                </Button>
                {page?.can_submit ? (
                  <Button
                    disabled={dirty || !rows.length}
                    onClick={() =>
                      setComposer({
                        version,
                        rows: structuredClone(rows),
                        selected,
                      })
                    }
                  >
                    証拠を提出する
                  </Button>
                ) : (
                  <Badge variant="outline">閲覧のみ</Badge>
                )}
              </div>
            </div>
            {dirty ? (
              <Alert>
                <AlertDescription>
                  未保存の変更があります。確認表を保存してから証拠を提出してください。既存の提出記録は閲覧できます。
                </AlertDescription>
              </Alert>
            ) : null}
            {page?.document_access_limited ? (
              <Alert>
                <AlertDescription>
                  文書の閲覧権限により、表示対象が制限されています。
                </AlertDescription>
              </Alert>
            ) : null}
            {items.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>保全状態</TableHead>
                    <TableHead>保存先</TableHead>
                    <TableHead>提出者・受付日時</TableHead>
                    <TableHead>記録・ファイル</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Badge
                          variant={
                            i.status === "failed" ? "destructive" : "secondary"
                          }
                        >
                          {evidenceStates[i.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>確認表 {i.plan_version}版</TableCell>
                      <TableCell>
                        {i.actor_name}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(i.created_at)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {i.entry_count}記録 · {i.verified_files}/{i.file_count}
                        ファイル
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetail(i.id)}
                        >
                          証拠と状態を見る
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>この範囲の提出記録はありません</EmptyTitle>
                  <EmptyDescription>
                    確認した行から少しずつ提出できます。まだ確認していないものをOKに補いません。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            {query.hasNextPage ? (
              <Button
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                次の提出記録
              </Button>
            ) : null}
            <p className="text-sm text-muted-foreground">
              保全完了は、選んだ記録・ファイルが保存された状態です。全条件の確認完了や要件の合格を表しません。
            </p>
          </>
        )}
        {composer && page?.can_submit ? (
          <EvidenceComposer
            context={{
              ...composer,
              projectId,
              planId,
              returnTo: `${pathname}?${params}`,
              queryScope: scope,
              documentAllowed: !page.document_access_limited,
            }}
            onClose={() => setComposer(null)}
            onCreated={(id) => {
              setComposer(null);
              setDetail(id);
              void client.invalidateQueries({ queryKey: scope });
            }}
          />
        ) : null}
        {detail ? (
          <EvidenceSetDetails
            key={detail}
            projectId={projectId}
            planId={planId}
            id={detail}
            queryScope={scope}
            onClose={() => setDetail(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
