"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRequirementTestItemsProjectsProjectIdRequirementsRequirementIdTestItemsGet as listItems } from "@/lib/api/generated/test-collaboration/test-collaboration";

export function RequirementTestItemsSection({
  projectId,
  requirementId,
}: {
  projectId: number;
  requirementId: number;
}) {
  const query = useQuery({
    queryKey: ["requirement-test-items", projectId, requirementId],
    queryFn: () => listItems(projectId, requirementId),
  });
  const active = (query.data ?? []).filter((row) => !row.item_deleted);
  return (
    <Card>
      <CardHeader>
        <CardTitle>関連テスト項目</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {query.isPending
            ? "関連項目を確認中…"
            : query.isError
              ? "関連項目を確認できません。"
              : active.length
                ? `関連する項目 ${active.length}件`
                : "テスト項目との関連なし"}
          {query.isSuccess &&
            "。これは関連の有無であり、検証の完全性を示すものではありません。"}
        </p>
        {query.isLoading && <p>読み込み中…</p>}
        {query.error && <p role="alert">関連項目を読み込めませんでした。</p>}
        {query.data?.map((row) => (
          <div key={row.id} className="rounded border px-3 py-2">
            {row.item_deleted ? (
              <span className="font-medium">
                {row.item_code} {row.item_content || "（内容なし）"}
              </span>
            ) : (
              <Link
                className="font-medium underline"
                href={`/projects/joined/${projectId}/test-designs/${row.design_id}?tab=items&item=${row.item_id}`}
              >
                {row.item_code} {row.item_content || "（内容なし）"}
              </Link>
            )}
            <p className="text-xs text-muted-foreground">
              {row.design_name}
              {row.item_deleted ? " · 項目削除済み" : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
