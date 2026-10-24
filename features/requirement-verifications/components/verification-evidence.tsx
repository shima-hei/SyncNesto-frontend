"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import type {
  VerificationCandidate,
  VerificationRow,
} from "@/lib/api/generated/model";
import { listCandidates } from "../lib/api";

const states: Record<VerificationCandidate["state"], string> = {
  inactive: "無効なパターン",
  not_generated: "ケース未生成",
  not_run: "未実行",
  in_progress: "実行中",
  passed: "直近実行OK",
  failed: "直近実行NG",
  blocked: "保留",
  not_applicable: "直近実行は対象外",
};

export function VerificationEvidence({
  projectId,
  planId,
  version,
  rowId,
  dirty,
  condition,
  canPrepare,
  onChange,
}: {
  projectId: number;
  planId: string;
  version: number;
  rowId: string | null;
  dirty: boolean;
  condition?: VerificationRow;
  canPrepare?: boolean;
  onChange?: (row: VerificationRow) => void;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const pathname = usePathname();
  const params = useSearchParams();
  const [individual, setIndividual] = useState<{
    candidate: VerificationCandidate;
    checked: boolean;
  } | null>(null);
  const query = useInfiniteQuery({
    queryKey: [
      "verification-candidates",
      tenant?.id,
      user?.id,
      projectId,
      planId,
      version,
      rowId,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listCandidates(projectId, planId, {
        row_id: rowId ?? undefined,
        browse_patterns: true,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(rowId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const scopeSelected = (candidate: VerificationCandidate) => {
    const target = condition?.targets?.find(
      (t) => t.item_id === candidate.item_id,
    );
    return (
      Boolean(target) &&
      (target?.pattern_scope !== "selected"
        ? candidate.state !== "inactive"
        : Boolean(
            candidate.pattern_id &&
            target.pattern_ids?.includes(candidate.pattern_id),
          ))
    );
  };
  const choose = (candidate: VerificationCandidate, checked: boolean) => {
    if (!condition || !onChange || !candidate.pattern_id) return;
    const targets = (condition.targets ?? []).map((target) => {
      if (target.item_id !== candidate.item_id) return target;
      const current =
        target.pattern_scope === "selected"
          ? (target.pattern_ids ?? [])
          : items
              .filter(
                (i) =>
                  i.item_id === target.item_id &&
                  i.pattern_id &&
                  i.state !== "inactive",
              )
              .map((i) => i.pattern_id!);
      return {
        ...target,
        pattern_scope: "selected" as const,
        pattern_ids: checked
          ? [...new Set([...current, candidate.pattern_id!])]
          : current.filter((id) => id !== candidate.pattern_id),
      };
    });
    onChange({ ...condition, targets });
  };
  const returnParams = new URLSearchParams(params);
  if (rowId) returnParams.set("row", rowId);
  const returnTo = `${pathname}?${returnParams}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>3. 現在のケースと直近実行</CardTitle>
        <CardDescription>
          保存した確認項目の参照情報です。実行時の要件版は未記録のため、旧実行の採用には後続工程で再確認が必要です。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!rowId ? (
          <p className="text-sm text-muted-foreground">
            確認項目を保存し、「実行候補を見る」から選んでください。
          </p>
        ) : query.isPending ? (
          <p className="text-sm">候補を読込中…</p>
        ) : query.isError ? (
          <DataLoadError
            resourceName="実行候補"
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {dirty ? (
              <Alert>
                <AlertDescription>
                  未保存の変更があります。候補は保存済みの確認項目に基づきます。対象の選択は保存後に確定します。
                </AlertDescription>
              </Alert>
            ) : null}
            {query.data?.pages.some((p) => p.state === "not_evaluated") ? (
              <Alert>
                <AlertDescription>
                  候補を照合できませんでした。関連の削除や容量上限などを確認し、再取得してください。合格や候補0件と判断していません。
                </AlertDescription>
              </Alert>
            ) : null}
            {items.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>確認対象</TableHead>
                    <TableHead>項目・組み合わせ</TableHead>
                    <TableHead>直近実行</TableHead>
                    <TableHead>現在のテスト内容との比較</TableHead>
                    <TableHead>元の記録</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={`${item.item_id}:${item.pattern_id ?? "single"}`}
                    >
                      <TableCell>
                        {item.pattern_id && canPrepare ? (
                          <Field orientation="horizontal">
                            <Checkbox
                              id={`pattern-${item.item_id}-${item.pattern_id}`}
                              checked={scopeSelected(item)}
                              disabled={
                                (item.state === "inactive" &&
                                  !scopeSelected(item)) ||
                                !condition?.targets?.some(
                                  (t) => t.item_id === item.item_id,
                                )
                              }
                              onCheckedChange={(checked) => {
                                const target = condition?.targets?.find(
                                  (t) => t.item_id === item.item_id,
                                );
                                if (target?.pattern_scope !== "selected")
                                  setIndividual({
                                    candidate: item,
                                    checked: Boolean(checked),
                                  });
                                else choose(item, Boolean(checked));
                              }}
                            />
                            <FieldLabel
                              className="sr-only"
                              htmlFor={`pattern-${item.item_id}-${item.pattern_id}`}
                            >
                              {item.pattern_name}を確認対象にする
                            </FieldLabel>
                          </Field>
                        ) : (
                          <Badge variant="outline">
                            {item.state === "inactive"
                              ? "無効"
                              : scopeSelected(item)
                                ? "対象"
                                : "未選択"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-words">
                        {item.item_title || "内容未入力"}
                        <p className="text-xs text-muted-foreground">
                          {item.pattern_name ?? "単独の項目"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{states[item.state]}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.comparison === "same"
                          ? "同じ内容"
                          : item.comparison === "changed"
                            ? "内容に変更あり"
                            : "未照合"}
                        <p className="text-xs text-muted-foreground">
                          要件への合格判定は未実施
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" asChild>
                          <Link
                            href={`/projects/joined/${projectId}/test-designs/${item.design_id}?${new URLSearchParams({ tab: "cases", ...(item.case_id ? { case: item.case_id } : {}), verificationReturn: returnTo })}`}
                          >
                            テストを開く
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                表示する実行候補がありません。確認方法とテストの関連を確認してください。
              </p>
            )}
            {canPrepare &&
            condition?.targets?.some((t) => t.pattern_scope === "selected") ? (
              <Button
                variant="outline"
                className="self-start"
                onClick={() => {
                  if (condition && onChange)
                    onChange({
                      ...condition,
                      targets: condition.targets?.map((t) => ({
                        ...t,
                        pattern_scope: "all_enabled",
                        pattern_ids: [],
                      })),
                    });
                }}
              >
                全有効パターンを使う設定に戻す
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              未選択の組み合わせも選択用に表示します。未選択を合格や対象外へ補完しません。パターンを個別選択する場合、現在読み込んだ一覧を候補にします。
            </p>
            {query.hasNextPage ? (
              <Button
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                次の候補を表示
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="self-start"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              実行候補を再取得
            </Button>
          </>
        )}
      </CardContent>
      <Dialog
        open={Boolean(individual)}
        onOpenChange={(open) => {
          if (!open) setIndividual(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>全有効パターンから個別選択へ変更</DialogTitle>
            <DialogDescription>
              現在読み込んだ候補を基本に、パターンを個別に選びます。まだ読み込んでいないパターンと、後から追加されたパターンは自動では対象に含まれません。必要な候補は先に「次の候補を表示」から読み込めます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndividual(null)}>
              一覧を確認する
            </Button>
            <Button
              onClick={() => {
                if (individual)
                  choose(individual.candidate, individual.checked);
                setIndividual(null);
              }}
            >
              表示中の候補から個別に選ぶ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
