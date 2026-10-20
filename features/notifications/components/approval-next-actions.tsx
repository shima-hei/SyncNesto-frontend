"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { readApprovalNextActionsProjectsProjectIdFixedApprovalsApprovalIdNextActionsGet as readNext } from "@/lib/api/generated/fixed-approvals/fixed-approvals";
import { approvalNextActionHref } from "../lib/approval-next-action";
import { useAuth } from "@/features/auth/providers/auth-provider";

const messages: Record<string, string> = {
  requested:
    "指定された承認者の判断を待っています。公開許可が失効している場合は、依頼を取り消して新しく依頼してください。",
  rejected:
    "差し戻し理由を確認し、必要な箇所を修正してください。変更後は新しい固定版を作り、新しい依頼で確認を受けます。",
  approved:
    "この固定内容への合意・承認が保存されています。元の内容から関連する設計・タスク・テストを確認し、必要な作業を進めてください。",
  approved_with_exceptions:
    "例外の理由と未合意の要件を確認してください。関連する設計・タスク・テストの進み具合は、それぞれの画面で確認できます。",
  cancelled:
    "必要性と対象の内容・相手・公開許可を確認して、新しい依頼を作成してください。",
};
const labels = {
  open_source: "元の内容・関連情報を確認",
  edit_source: "元の内容を修正",
  open_fixed_versions: "固定版を確認・作成",
  open_publication: "公開内容・相手を確認",
};

export function ApprovalNextActions({
  projectId,
  approvalId,
  version,
}: {
  projectId: number;
  approvalId: string;
  version: number;
}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [
      "approval-next-actions",
      user?.id,
      projectId,
      approvalId,
      version,
    ],
    queryFn: ({ signal }) => readNext(projectId, approvalId, { signal }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  if (query.isPending)
    return <Skeleton className="h-24 w-full" aria-label="次の操作を確認中" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="次の操作"
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  const name = data.next_actor.name || "指定された担当者";
  return (
    <Alert>
      <AlertTitle>
        次にすること · {name}
        {data.next_actor.is_you ? "（あなた）" : ""}
      </AlertTitle>
      <AlertDescription>
        <p>
          {data.status === "requested" && data.next_actor.kind === "requester"
            ? "現在この依頼は判断を進められません。公開状態・相手の参加資格と許可を確認し、依頼を取り消して新しく依頼してください。"
            : data.status === "requested" && data.next_actor.is_you
              ? "依頼の目的と固定内容・例外を確認し、合意・承認または差し戻しを判断してください。"
              : messages[data.status] ||
                "固定内容と判断履歴を確認してください。"}
        </p>
        <div className="flex flex-wrap gap-2">
          {data.actions.map((action) => {
            const href = approvalNextActionHref(projectId, action);
            return href ? (
              <Button key={action.kind} variant="outline" size="sm" asChild>
                <Link href={href}>{labels[action.kind]}</Link>
              </Button>
            ) : null;
          })}
        </div>
        <p>
          合意・承認はこの固定内容に対する記録です。関連する作業の完了を表すものではありません。
        </p>
      </AlertDescription>
    </Alert>
  );
}
