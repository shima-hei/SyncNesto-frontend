"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { formatDateTime } from "@/lib/format/date";
import { listRevisions } from "../lib/api";

export function VerificationHistory({
  projectId,
  planId,
  version,
}: {
  projectId: number;
  planId: string;
  version: number;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const query = useInfiniteQuery({
    queryKey: [
      "verification-history",
      tenant?.id,
      user?.id,
      projectId,
      planId,
      version,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listRevisions(projectId, planId, { cursor: pageParam, page_size: 5 }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>4. 確認表の保存履歴</CardTitle>
        <CardDescription>
          誰が、いつ、どの確認項目を保存したかを確認できます。過去版は編集できません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isError ? (
          <DataLoadError
            resourceName="確認表の保存履歴"
            onRetry={() => void query.refetch()}
          />
        ) : query.isPending ? (
          <p className="text-sm text-muted-foreground">保存履歴を読込中…</p>
        ) : (
          query.data.pages
            .flatMap((page) => page.items)
            .map((revision) => (
              <details key={revision.version} className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm">
                  {revision.version}版 · {revision.actor_name} ·{" "}
                  {formatDateTime(revision.created_at)}{" "}
                  <Badge variant="outline">
                    {revision.checklist.coverage ? "対応を確認" : "下書き"}
                  </Badge>
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {revision.checklist.rows?.length ? (
                    revision.checklist.rows.map((row, index) => (
                      <section key={row.id} className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          {index + 1}. {row.description || "確認内容は未入力"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {row.method === "test"
                            ? "テスト"
                            : row.method === "manual"
                              ? "手動確認"
                              : row.method === "not_applicable"
                                ? "対象外候補"
                                : "方法は未設定"}
                        </p>
                        {row.reference?.text ? (
                          <blockquote className="border-l-2 pl-3 text-sm">
                            {row.reference.text}
                          </blockquote>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {row.manual_plan ||
                            row.not_applicable_reason ||
                            row.notes}
                        </p>
                        {row.targets?.length ? (
                          <p className="text-xs text-muted-foreground">
                            関連するテスト項目 {row.targets.length}件
                          </p>
                        ) : null}
                      </section>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      固定対象だけを指定した初版です。
                    </p>
                  )}
                </div>
              </details>
            ))
        )}
        {query.hasNextPage ? (
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            続きの保存履歴を表示
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
