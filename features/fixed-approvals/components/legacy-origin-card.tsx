"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { formatDateTime } from "@/lib/format/date";
import { readImport } from "../lib/api";
import {
  evidenceIssues,
  numberValue,
  statusLabels,
  textValue,
} from "../lib/display";

export function LegacyOriginCard({
  projectId,
  importId,
}: {
  projectId: number;
  importId: string;
}) {
  const query = useInfiniteQuery({
    queryKey: ["legacy-origin", projectId, importId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      readImport(projectId, importId, { cursor: pageParam }),
    getNextPageParam: (result) => result.next_cursor ?? undefined,
    retry: false,
  });
  if (query.error)
    return (
      <DataLoadError
        resourceName="引き継いだ従来履歴"
        onRetry={() => void query.refetch()}
      />
    );
  const first = query.data?.pages[0];
  if (!first) return <p>従来の判断記録を確認しています…</p>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>引き継いだ従来承認 #{first.legacy_approval_id}</CardTitle>
        <CardDescription>
          旧記録と今回の依頼は別の判断です。元の対象が削除されても、取込時点の記録を保持します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm">
          当時の状態：
          {statusLabels[textValue(first.source.status)] ??
            textValue(first.source.status)}{" "}
          ／ 指定先 ID {numberValue(first.source.approver_id)} ／ 申請日時{" "}
          {formatDateTime(textValue(first.source.requested_at))}
        </p>
        {evidenceIssues(first.evidence).map((issue) => (
          <p className="text-sm" key={issue}>
            {issue}
          </p>
        ))}
        <p className="whitespace-pre-wrap text-sm">
          元のメモ：{textValue(first.source.comment, "記録なし")}
        </p>
        {query.data?.pages
          .flatMap((item) => item.logs)
          .map((log, index) => (
            <div key={numberValue(log.id) || index} className="border-b pb-2">
              <p className="text-sm">
                {statusLabels[textValue(log.action).replace("approval.", "")] ??
                  textValue(log.action)}
                ・実操作者 ID {numberValue(log.changed_by) || "不明"}
              </p>
              <p className="text-xs text-muted-foreground">
                当時 {formatDateTime(textValue(log.changed_at))} ／ 取込{" "}
                {formatDateTime(first.created_at)}
              </p>
            </div>
          ))}
        {query.hasNextPage ? (
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            履歴の続きを見る
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
