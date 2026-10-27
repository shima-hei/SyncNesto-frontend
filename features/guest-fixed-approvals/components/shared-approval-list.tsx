"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { formatDateTime } from "@/lib/format/date";
import { ApiError } from "@/lib/api/error";
import { statusLabels } from "@/features/fixed-approvals/lib/display";
import { listSharedApprovals } from "../lib/api";
import { approvalKindLabels, sharedApprovalPath } from "../lib/display";
import { ApprovalMfa } from "./approval-mfa";

export function SharedApprovalList({
  publicationId,
}: {
  publicationId?: string;
}) {
  const [view, setView] = useState("requested");
  const [cursor, setCursor] = useState<string | undefined>();
  const load = useCallback(
    (signal: AbortSignal) =>
      listSharedApprovals(
        {
          publication_id: publicationId,
          status: view === "requested" ? "requested" : undefined,
          cursor,
          page_size: 20,
        },
        { signal },
      ),
    [publicationId, view, cursor],
  );
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const data = useFreshShared(
    JSON.stringify([publicationId, view, cursor]),
    load,
    mask,
  );
  const { value, refresh } = data;
  useEffect(() => {
    if (!value?.items.length) return;
    const expires = Math.min(
      ...value.items.map((row) => Date.parse(row.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expires - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);
  return (
    <section
      aria-label="あなたへの判断依頼"
      className="flex min-w-0 flex-col gap-3"
    >
      <div>
        <h2 className="text-base font-semibold">あなたへの判断依頼</h2>
        <p className="text-sm text-muted-foreground">
          依頼された内容を確認して、合意・承認または差し戻しを行います。
        </p>
      </div>
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(next) => {
          if (next) {
            setView(next);
            setCursor(undefined);
          }
        }}
        aria-label="判断依頼の表示"
      >
        <ToggleGroupItem value="requested">要対応</ToggleGroupItem>
        <ToggleGroupItem value="all">履歴を含む</ToggleGroupItem>
      </ToggleGroup>
      <div ref={root}>
        {data.error instanceof ApiError &&
        data.error.code === "MFA_REQUIRED" ? (
          <ApprovalMfa
            returnTo={
              publicationId
                ? `/shared/publications/${publicationId}`
                : "/shared/publications"
            }
          />
        ) : data.error ? (
          <Alert>
            <AlertTitle>現在の判断依頼を確認できません</AlertTitle>
            <AlertDescription>
              接続・公開許可・期限を確認してください。
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
              >
                再確認
              </Button>
            </AlertDescription>
          </Alert>
        ) : !value ? (
          <Skeleton className="h-24" />
        ) : !value.items.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>現在確認できる判断依頼はありません</EmptyTitle>
              <EmptyDescription>
                招待への参加や資料の閲覧だけで、承認を依頼されたことにはなりません。履歴を含めて確認することもできます。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <p className="text-sm">現在確認できる依頼 {value.total}件</p>
            <div className="flex min-w-0 flex-col gap-3">
              {value.items.map((row) => (
                <Card key={row.id} className="min-w-0">
                  <CardHeader className="min-w-0 gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant={
                          row.status === "rejected" ||
                          row.status === "cancelled"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {statusLabels[row.status]}
                      </Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={sharedApprovalPath(row.publication_id, row.id)}
                          prefetch={false}
                        >
                          内容を確認
                        </Link>
                      </Button>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="min-w-0 max-w-full break-words">
                        依頼元：{row.requester_name}
                      </span>
                      <span>固定日時：{formatDateTime(row.captured_at)}</span>
                    </div>
                    <CardTitle className="min-w-0 break-words text-base">
                      <Link
                        className="underline underline-offset-4"
                        href={sharedApprovalPath(row.publication_id, row.id)}
                        prefetch={false}
                      >
                        {row.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm">
                    <p>
                      {approvalKindLabels[row.target_kind]} · 申請{" "}
                      {formatDateTime(row.created_at)}
                    </p>
                    {row.status === "requested" ? (
                      <p
                        className={
                          row.can_decide
                            ? "text-muted-foreground"
                            : "font-medium text-destructive"
                        }
                      >
                        {row.can_decide
                          ? "次は固定内容を確認して、判断へ進みます。"
                          : "現在、新しい判断操作は停止しています。依頼元へ確認してください。"}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        保存された判断を確認できます。
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-2">
              {cursor ? (
                <Button variant="outline" onClick={() => setCursor(undefined)}>
                  先頭へ
                </Button>
              ) : null}
              {value.next_cursor ? (
                <Button
                  variant="outline"
                  onClick={() => setCursor(value.next_cursor!)}
                >
                  次へ
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
