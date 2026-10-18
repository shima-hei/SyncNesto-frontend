"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format/date";
import { listApprovals } from "../lib/api";
import { approvalPath, evidenceIssues, statusLabels } from "../lib/display";
import { ApprovalRequestForm } from "./approval-request-form";
import { LegacyMigrationPanel } from "./legacy-migration-panel";
import { ChoiceField } from "./choice-field";

export function ApprovalWorkspace({
  projectId,
  releaseId,
  legacyId,
  originImport,
  targetKind,
  sourceId,
}: {
  projectId: number;
  releaseId?: string;
  legacyId?: number;
  originImport?: string;
  targetKind?: string;
  sourceId?: number;
}) {
  const { user } = useAuth();
  const role = useCurrentProjectRole(projectId);
  const canManage =
    user?.user_type === "internal" &&
    !user.demo &&
    ["project_admin", "manager"].includes(
      role.currentProjectRole?.role?.key ?? "",
    );
  const [page, setPage] = useUrlFilterState("page", 1);
  const [status, setStatus] = useUrlFilterState("status", "");
  const [mine, setMine] = useUrlFilterState("mine", "");
  const [selectedLegacy, setSelectedLegacy] = useUrlFilterState("legacy", 0);
  const history = useQuery({
    queryKey: [
      "approval-history",
      projectId,
      page,
      status,
      mine,
      targetKind,
      sourceId,
    ],
    queryFn: () =>
      listApprovals(projectId, {
        page,
        page_size: 20,
        status: status || undefined,
        mine: mine === "true",
        target_kind: targetKind,
        source_id: sourceId,
      }),
    retry: false,
  });
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="合意・承認"
        description="どの内容に誰の判断が必要か、何が未合意のまま残っているかを確認します。"
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button asChild>
                <Link
                  href={`/projects/joined/${projectId}/artifact-releases${sourceId && (targetKind === "requirement" || targetKind === "requirement_document") ? `?kind=${targetKind}&sourceId=${sourceId}` : ""}`}
                >
                  固定版を確認して依頼する
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/projects/joined/${projectId}/requirements`}>
                要件定義へ
              </Link>
            </Button>
          </div>
        }
      />
      <Alert>
        <AlertTitle>要件の合意と、文書の正式承認は別の判断です</AlertTitle>
        <AlertDescription>
          元の内容が更新されても過去の合意はその固定内容に残ります。タスク完了・テスト合格・顧客公開を自動的に確定するものではありません。
        </AlertDescription>
      </Alert>
      {releaseId && canManage ? (
        <ApprovalRequestForm
          key={`${releaseId}:${legacyId ?? originImport ?? "new"}`}
          projectId={projectId}
          releaseId={releaseId}
          legacyId={legacyId}
          originImport={originImport}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>依頼と判断履歴</CardTitle>
          <CardDescription>
            従来の記録と、内容を固定した新しい依頼を区別して表示します。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceField
              label="表示する依頼"
              compact
              value={mine || "all"}
              onChange={(value) => {
                setMine(value === "all" ? "" : value);
                setPage(1);
              }}
              choices={[
                { value: "all", label: "すべての依頼" },
                { value: "true", label: "自分への依頼・自分の申請" },
              ]}
            />
            <ChoiceField
              label="状態"
              compact
              value={status || "all"}
              onChange={(value) => {
                setStatus(value === "all" ? "" : value);
                setPage(1);
              }}
              choices={[
                { value: "all", label: "すべての状態" },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>
          {history.error ? (
            <DataLoadError
              resourceName="承認履歴"
              onRetry={() => void history.refetch()}
            />
          ) : history.isPending ? (
            <p>依頼を読み込んでいます…</p>
          ) : history.data?.items.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>対象・方式</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>指定先・申請日時</TableHead>
                    <TableHead>確認</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.items.map((item) => (
                    <TableRow key={`${item.scheme}:${item.id}`}>
                      <TableCell>
                        <p className="max-w-72 truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.scheme === "legacy"
                            ? "従来承認・対象版未固定"
                            : item.target_kind === "requirement"
                              ? "個別要件の合意"
                              : "要件定義書の正式承認"}
                          ・対象 ID {item.source_id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.migrated_to
                            ? "新方式へ切替済み"
                            : `${item.scheme === "legacy" ? "従来：" : ""}${statusLabels[item.status] ?? item.status}`}
                        </Badge>
                        {item.scheme === "legacy" &&
                        evidenceIssues(item.evidence).some((issue) =>
                          issue.includes("異なり"),
                        ) ? (
                          <p className="text-xs text-muted-foreground">
                            実操作者と指定先が異なります
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">本人 ID {item.approver_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.scheme === "fixed" ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={approvalPath(projectId, item.id)}>
                              内容・判断履歴
                            </Link>
                          </Button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLegacy(Number(item.id))}
                            >
                              従来記録を確認
                            </Button>
                            {item.migrated_to ? (
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  href={approvalPath(
                                    projectId,
                                    item.migrated_to,
                                  )}
                                >
                                  切替先へ
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataPagination
                page={page}
                pageSize={20}
                total={history.data.total}
                currentCount={history.data.items.length}
                isFetching={history.isFetching}
                onPageChange={setPage}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              この条件に該当する依頼はありません。要件や定義書の「固定版と添付」から対象を保存して、合意・正式承認を依頼できます。
            </p>
          )}
        </CardContent>
      </Card>
      {selectedLegacy > 0 ? (
        <LegacyMigrationPanel
          key={selectedLegacy}
          projectId={projectId}
          legacyId={selectedLegacy}
          canManage={!!canManage}
          importId={
            history.data?.items.find(
              (item) =>
                item.scheme === "legacy" && Number(item.id) === selectedLegacy,
            )?.import_id
          }
        />
      ) : null}
    </div>
  );
}
