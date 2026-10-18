"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type {
  ArtifactPreview,
  ArtifactSource,
} from "@/lib/api/generated/model";
import {
  createRelease,
  listReleases,
  previewRelease,
  readSource,
} from "../lib/api";
import { safeArtifactOrigin, type ArtifactKind } from "../lib/navigation";
import { AttachmentPreservations } from "./attachment-preservations";
import { SnapshotContent } from "./snapshot-content";
import { displayBytes, displayDate } from "../lib/display";

const kinds: Record<string, string> = {
  requirement_document: "要件定義書",
  requirement: "要件",
  specification: "画面・API設計",
  test_design: "テスト設計",
  test_design_part: "本文データの分割",
  section: "セクション",
  requirement_detail: "種別別の詳細",
};

export function ArtifactReleasesPage({
  projectId,
  source,
  from,
}: {
  projectId: number;
  source?: { kind: ArtifactKind; id: number };
  from: string | null;
}) {
  const { user } = useAuth();
  const role = useCurrentProjectRole(projectId);
  const allowed =
    user?.user_type === "internal" &&
    !user.demo &&
    ["project_admin", "manager"].includes(
      role.currentProjectRole?.role?.key ?? "",
    );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="固定版と添付"
        description="レビューする時点の本文と添付を残し、あとから同じ内容を確認できます。"
        actions={
          <Button asChild variant="outline">
            <Link href={safeArtifactOrigin(from, projectId)}>
              <ArrowLeftIcon data-icon="inline-start" />
              元の画面へ戻る
            </Link>
          </Button>
        }
      />
      {role.isLoading ? (
        <Skeleton className="h-24" />
      ) : role.error ? (
        <DataLoadError
          resourceName="権限"
          onRetry={() => window.location.reload()}
        />
      ) : !allowed ? (
        <Alert>
          <AlertTitle>
            プロジェクト管理者・マネージャー向けの機能です
          </AlertTitle>
          <AlertDescription>
            内部メンバーの権限を確認してください。
          </AlertDescription>
        </Alert>
      ) : (
        <ReleaseWorkspace
          key={`${projectId}:${source?.kind}:${source?.id}`}
          projectId={projectId}
          source={source}
        />
      )}
    </div>
  );
}

function ReleaseWorkspace({
  projectId,
  source,
}: {
  projectId: number;
  source?: { kind: ArtifactKind; id: number };
}) {
  const cache = useQueryClient();
  const [page, setPage] = useUrlFilterState("page", 1);
  const [selected, setSelected] = useUrlFilterState("release", "");
  const [confirmed, setConfirmed] = useState<{
    preview: ArtifactPreview;
    requestId: string;
  } | null>(null);
  const sourceQuery = useQuery({
    queryKey: ["artifact-source", projectId, source?.kind, source?.id],
    queryFn: () => readSource(projectId, source!.kind, source!.id),
    enabled: !!source,
    retry: false,
  });
  const releases = useQuery({
    queryKey: ["artifact-releases", projectId, source?.kind, source?.id, page],
    queryFn: () =>
      listReleases(projectId, {
        page,
        page_size: 20,
        source_kind: source?.kind,
        source_id: source?.id,
      }),
    retry: false,
  });
  const preview = useMutation({
    mutationFn: async () => {
      const current = await sourceQuery.refetch();
      if (!current.data || current.error)
        throw current.error ?? new Error("source unavailable");
      const ref: ArtifactSource = {
        kind: current.data.kind,
        id: current.data.id,
        version: current.data.version,
      };
      return previewRelease(projectId, { source: ref });
    },
    onSuccess: (value) =>
      setConfirmed({ preview: value, requestId: crypto.randomUUID() }),
  });
  const save = useMutation({
    mutationFn: () =>
      createRelease(projectId, {
        source: confirmed!.preview.source,
        request_id: confirmed!.requestId,
        expected_scope_digest: confirmed!.preview.scope_digest,
      }),
    onSuccess: async (value) => {
      setConfirmed(null);
      setSelected(value.id);
      setPage(1);
      await cache.invalidateQueries({
        queryKey: ["artifact-releases", projectId],
      });
    },
  });
  const row = releases.data?.items.find((item) => item.id === selected);
  return (
    <>
      <Alert>
        <AlertTitle>プロジェクト内で確認する固定版</AlertTitle>
        <AlertDescription>
          作成しただけでは顧客に公開されず、正式な承認にもなりません。添付は本文の固定後に選びます。
        </AlertDescription>
      </Alert>
      {source ? (
        <Card>
          <CardHeader>
            <CardTitle>1. 本文を固定する</CardTitle>
            <CardDescription>
              現在の内容を確認して保存します。要件定義書は配下のセクションと要件を含みます。
              テスト設計は保存済みの項目・因子水準・組み合わせ・書式を含み、未保存の下書きや実行結果は含みません。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sourceQuery.isPending ? (
              <Skeleton className="h-10" />
            ) : sourceQuery.error ? (
              <DataLoadError
                resourceName="元の内容"
                onRetry={() => void sourceQuery.refetch()}
              />
            ) : (
              <p className="break-words font-medium">
                {sourceQuery.data?.title}{" "}
                <Badge variant="secondary">
                  {kinds[source.kind]}・版 {sourceQuery.data?.version}
                </Badge>
              </p>
            )}
            <div>
              <Button
                variant="outline"
                disabled={
                  preview.isPending || save.isPending || !sourceQuery.data
                }
                onClick={() => {
                  setConfirmed(null);
                  save.reset();
                  preview.mutate();
                }}
              >
                {preview.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                固定する範囲を確認
              </Button>
            </div>
            <FormApiError error={preview.error} />
            {confirmed ? (
              <div className="flex flex-col gap-3" aria-live="polite">
                {sourceQuery.data?.counts ? (
                  <p className="text-sm">
                    テスト項目 {sourceQuery.data.counts.items}件 / 因子{" "}
                    {sourceQuery.data.counts.factors}件 / 水準{" "}
                    {sourceQuery.data.counts.levels}件 / 組み合わせ{" "}
                    {sourceQuery.data.counts.patterns}件
                  </p>
                ) : null}
                <p>
                  {confirmed.preview.title}・版{" "}
                  {confirmed.preview.source.version}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Object.entries(confirmed.preview.node_counts)
                    .map(([key, count]) => `${kinds[key] ?? key} ${count}件`)
                    .join(" / ")}
                  （{displayBytes(confirmed.preview.byte_size)}）
                </p>
                <div>
                  <Button
                    disabled={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    {save.isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    この内容で固定版を保存
                  </Button>
                </div>
                <FormApiError error={save.error} />
                <p className="text-xs text-muted-foreground">
                  元の内容が更新された場合は、範囲を確認し直してください。通信に失敗したときは同じボタンから再試行できます。
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>保存した固定版</CardTitle>
          <CardDescription>
            対象を選ぶと、保存した本文と添付の保全状況を確認できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {releases.isPending ? (
            <Skeleton className="h-24" />
          ) : releases.error ? (
            <DataLoadError
              resourceName="固定版"
              onRetry={() => void releases.refetch()}
            />
          ) : !releases.data.items.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>固定版はまだありません</EmptyTitle>
                <EmptyDescription>
                  元の要件・要件定義書・画面やAPI設計の「固定版と添付」から保存できます。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>対象</TableHead>
                    <TableHead>元の版</TableHead>
                    <TableHead>保存日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.data.items.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={selected === item.id ? "selected" : undefined}
                    >
                      <TableCell className="max-w-80 whitespace-normal break-words">
                        {item.title}
                        <p className="text-xs text-muted-foreground">
                          {kinds[item.source_kind]}
                        </p>
                      </TableCell>
                      <TableCell>{item.source_version}</TableCell>
                      <TableCell>{displayDate(item.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={selected === item.id}
                          onClick={() => setSelected(item.id)}
                        >
                          確認する
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataPagination
                page={page}
                pageSize={20}
                total={releases.data.total}
                currentCount={releases.data.items.length}
                onPageChange={setPage}
                isFetching={releases.isFetching}
              />
            </>
          )}
        </CardContent>
      </Card>
      {selected && /^[0-9a-f-]{36}$/i.test(selected) ? (
        <section
          className="flex min-w-0 flex-col gap-6"
          aria-label="選択した固定版"
        >
          <Card>
            <CardHeader>
              <CardTitle>{row?.title ?? "選択した固定版の本文"}</CardTitle>
              <CardDescription>
                {row
                  ? `元の版 ${row.source_version}・${displayDate(row.captured_at)} 時点`
                  : "保存した時点の本文を表示します。"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SnapshotContent
                key={selected}
                projectId={projectId}
                releaseId={selected}
              />
            </CardContent>
          </Card>
          <AttachmentPreservations
            key={selected}
            projectId={projectId}
            releaseId={selected}
          />
        </section>
      ) : null}
    </>
  );
}
