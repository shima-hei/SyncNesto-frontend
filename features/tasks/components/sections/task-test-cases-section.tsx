"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listIssueTestCasesProjectsProjectIdTasksTaskIdTestCasesGet as listTestCases } from "@/lib/api/generated/test-issues/test-issues";

const statuses: Record<string, string> = {
  not_run: "未実行",
  in_progress: "実施中",
  passed: "成功",
  failed: "失敗",
  blocked: "保留",
  not_applicable: "対象外",
};

export function TaskTestCasesSection({
  projectId,
  taskId,
}: {
  projectId: number;
  taskId: number;
}) {
  const query = useQuery({
    queryKey: ["issue-test-cases", projectId, taskId],
    queryFn: () => listTestCases(projectId, taskId),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>関連テストケース</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isLoading && <p className="text-sm">読み込み中…</p>}
        {query.error && (
          <p role="alert" className="text-sm">
            関連ケースを読み込めませんでした。
          </p>
        )}
        {query.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            関連するテストケースはありません。
          </p>
        )}
        {query.data?.map((testCase) => (
          <Link
            key={testCase.link_id}
            href={`/projects/joined/${projectId}/test-cases?design=${testCase.design_id}&case=${testCase.case_id}${testCase.origin_execution_id ? `&execution=${testCase.origin_execution_id}` : ""}`}
            className="block rounded border p-3 text-sm hover:bg-accent"
          >
            <span className="font-medium">
              {testCase.item_code} {testCase.pattern_code ?? ""}
            </span>
            <span className="ml-2">{testCase.item_content}</span>
            <span className="ml-2 text-muted-foreground">
              {testCase.design_name} ·{" "}
              {statuses[testCase.status] ?? testCase.status}
            </span>
            {testCase.origin_execution_id && (
              <span className="ml-2 text-muted-foreground">
                起票元の実行履歴あり
              </span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
