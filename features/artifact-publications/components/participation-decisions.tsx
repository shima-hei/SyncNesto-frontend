import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { displayDate } from "@/features/artifact-releases/lib/display";
import {
  approvalPath,
  statusLabels,
} from "@/features/fixed-approvals/lib/display";
import {
  requirementWorkflowHref,
  reviewRequestStatus,
} from "@/features/requirements/lib/requirement-workflow-review";
import type { GuestParticipationDecisionRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { listParticipationDecisions } from "../lib/access-api";

const pageSize = 20;
const states: Record<string, string> = {
  ...statusLabels,
  ...reviewRequestStatus,
  pending: "回答待ち",
  confirmed: "確認済み",
  changes_requested: "修正依頼",
};

function requestLabel(item: GuestParticipationDecisionRead) {
  if (item.kind === "review") return "認識合わせ";
  if (item.target_kind === "requirement") return "個別要件の合意";
  if (item.target_kind === "specification") return "設計書の正式承認";
  if (item.target_kind === "test_design") return "テスト設計書の正式承認";
  return "要件定義書の正式承認";
}

export function ParticipationDecisions({
  projectId,
  participationId,
}: {
  projectId: number;
  participationId: string;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "guest-participation-decisions",
      projectId,
      participationId,
      page,
    ],
    queryFn: ({ signal }) =>
      listParticipationDecisions(
        projectId,
        participationId,
        { page, page_size: pageSize },
        { signal },
      ),
    retry: false,
    gcTime: 0,
  });
  if (query.isError)
    return (
      <DataLoadError
        resourceName="判断依頼"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return <Skeleton className="h-16" />;
  if (!query.data.items.length)
    return <EmptyState message="閲覧できる判断依頼はありません。" />;
  return (
    <div className="grid gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>依頼・対象版</TableHead>
            <TableHead>本人の回答</TableHead>
            <TableHead>回答期限</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data.items.map((item) => {
            const href =
              item.kind === "fixed_approval"
                ? approvalPath(projectId, item.id)
                : requirementWorkflowHref(projectId, item.id);
            const state =
              item.state === "cancelled"
                ? item.state
                : (item.response_state ?? item.state);
            const response =
              state === "requested" ? "回答待ち" : (states[state] ?? state);
            const access =
              item.access_state === "revoked"
                ? "共有取消済み"
                : item.access_state === "expired"
                  ? "共有期限切れ"
                  : undefined;
            return (
              <TableRow key={`${item.kind}:${item.id}`}>
                <TableCell className="whitespace-normal">
                  <p className="text-xs text-muted-foreground">
                    {requestLabel(item)}
                  </p>
                  <Link
                    href={href}
                    prefetch={false}
                    className="underline underline-offset-4"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {displayDate(item.captured_at)}の版
                  </p>
                </TableCell>
                <TableCell>
                  {response}
                  {access && (
                    <p className="text-xs text-muted-foreground">{access}</p>
                  )}
                  {item.responded_at && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.responded_at)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {item.decision_expires_at
                    ? formatDateTime(item.decision_expires_at)
                    : item.due_on
                      ? displayDate(item.due_on)
                      : "期限なし"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {query.data.total > pageSize && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          total={query.data.total}
          currentCount={query.data.items.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
