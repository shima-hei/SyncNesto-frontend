"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  listReleases,
  listPreservations,
} from "@/features/artifact-releases/lib/api";
import {
  displayBytes,
  displayDate,
} from "@/features/artifact-releases/lib/display";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type {
  PublicationNodeRead,
  PublicationPreview,
  PublicationPreviewRequest,
} from "@/lib/api/generated/model";
import {
  createPublication,
  listPublications,
  previewPublication,
  readPublication,
  readRelease,
} from "../lib/api";
import { PublicationContent } from "./publication-content";
import {
  PublicationAccessPanel,
  publicationStateLabel,
} from "./access-controls";

import { GuestApprovalRequestPanel } from "@/features/guest-fixed-approvals/components/request-panel";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREPARATION_WRITES_ENABLED = true;

export function PublicationsPage({
  projectId,
  requestsEnabled = false,
}: {
  projectId: number;
  requestsEnabled?: boolean;
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
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="公開内容を確認"
        description="相手へ渡す本文と添付の構成を、固定版から準備します。"
        actions={
          <Button asChild variant="outline">
            <Link href={`/projects/joined/${projectId}/artifact-releases`}>
              <ArrowLeftIcon data-icon="inline-start" />
              固定版一覧へ戻る
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
          <AlertTitle>内部メンバーの管理者・マネージャー向けです</AlertTitle>
          <AlertDescription>
            現在のプロジェクト権限を確認してください。
          </AlertDescription>
        </Alert>
      ) : (
        <Workspace projectId={projectId} requestsEnabled={requestsEnabled} />
      )}
    </div>
  );
}

function Workspace({
  projectId,
  requestsEnabled,
}: {
  projectId: number;
  requestsEnabled: boolean;
}) {
  const cache = useQueryClient();
  const [release, setRelease] = useUrlFilterState("release", "");
  const [publication, setPublication] = useUrlFilterState("publication", "");
  const [page, setPage] = useUrlFilterState("page", 1);
  const [sourcePage, setSourcePage] = useState(1);
  const [preservationPage, setPreservationPage] = useState(1);
  const [preservation, setPreservation] = useState("none");
  const [confirmed, setConfirmed] = useState<{
    data: PublicationPreviewRequest;
    preview: PublicationPreview;
  } | null>(null);
  const sources = useQuery({
    queryKey: [
      "artifact-releases",
      projectId,
      "publication-source",
      sourcePage,
    ],
    queryFn: () => listReleases(projectId, { page: sourcePage, page_size: 20 }),
    retry: false,
  });
  const selectedSource = useQuery({
    queryKey: ["publication-source", projectId, release],
    queryFn: () => readRelease(projectId, release),
    enabled: uuid.test(release),
    retry: false,
  });
  const preserved = useQuery({
    queryKey: [
      "publication-preservations",
      projectId,
      release,
      preservationPage,
    ],
    queryFn: () =>
      listPreservations(projectId, release, {
        page: preservationPage,
        page_size: 20,
      }),
    enabled: uuid.test(release),
    retry: false,
  });
  const listing = useQuery({
    queryKey: ["publications", projectId, page, release],
    queryFn: () =>
      listPublications(projectId, {
        page,
        page_size: 20,
        release_id: uuid.test(release) ? release : undefined,
      }),
    retry: false,
  });
  const preview = useMutation({
    mutationFn: async () => {
      const source = await readRelease(projectId, release);
      const data: PublicationPreviewRequest = {
        release_id: release,
        projection_version:
          source.projection_version === "internal-preview-v2"
            ? "public-preview-v2"
            : "public-preview-v1",
        preservation_id: preservation === "none" ? null : preservation,
        request_id: crypto.randomUUID(),
      };
      return { data, preview: await previewPublication(projectId, data) };
    },
    onSuccess: setConfirmed,
  });
  const save = useMutation({
    mutationFn: () =>
      createPublication(projectId, {
        ...confirmed!.data,
        expected_public_digest: confirmed!.preview.public_digest,
        expected_source_manifest_digest:
          confirmed!.preview.source_manifest_digest,
      }),
    onSuccess: async (row) => {
      setPublication(row.content.id);
      setConfirmed(null);
      setPage(1);
      await cache.invalidateQueries({ queryKey: ["publications", projectId] });
    },
  });
  const busy = preview.isPending || save.isPending;
  const chooseRelease = (id: string) => {
    setRelease(id);
    setPublication("");
    setPreservation("none");
    setPreservationPage(1);
    setConfirmed(null);
    preview.reset();
    save.reset();
    setPage(1);
  };
  return (
    <>
      <Alert>
        <AlertTitle>固定した内容の公開を管理します</AlertTitle>
        <AlertDescription>
          保存しても相手の閲覧許可は発行されず、承認にもなりません。全文・設計例・テストデータ・添付を確認し、機密があれば元データを直して新しい固定版を作ってください。
        </AlertDescription>
      </Alert>
      {PREPARATION_WRITES_ENABLED ? (
        <Card>
          <CardHeader>
            <CardTitle>1. 相手へ見せる内容を選ぶ</CardTitle>
            <CardDescription>
              固定版の本文全体と、保全が完了した添付構成を選びます。行・列・章の一部だけを隠すことはできません。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="publication-source">
                  固定した本文
                </FieldLabel>
                {sources.isPending ? (
                  <Skeleton className="h-9" />
                ) : sources.error ? (
                  <DataLoadError
                    resourceName="固定版"
                    onRetry={() => void sources.refetch()}
                  />
                ) : sources.data.items.length === 0 ? (
                  <p className="text-sm">
                    固定版がありません。固定版画面で本文を保存してください。
                  </p>
                ) : (
                  <>
                    <Select
                      value={uuid.test(release) ? release : undefined}
                      onValueChange={chooseRelease}
                      disabled={busy}
                    >
                      <SelectTrigger id="publication-source" className="w-full">
                        <SelectValue placeholder="固定版を選択">
                          {selectedSource.data
                            ? `${selectedSource.data.title}・元の版 ${selectedSource.data.source_version}`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sources.data.items.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title}・元の版 {r.source_version}・
                              {displayDate(r.created_at)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <DataPagination
                      page={sourcePage}
                      pageSize={20}
                      total={sources.data.total}
                      currentCount={sources.data.items.length}
                      onPageChange={setSourcePage}
                      isFetching={sources.isFetching}
                    />
                  </>
                )}
                <FieldDescription>
                  相手に見せたい目的・要件・設計・テストが含まれている版か確認します。
                </FieldDescription>
              </Field>
              {uuid.test(release) ? (
                <Field>
                  <FieldLabel htmlFor="publication-preservation">
                    保全した添付構成
                  </FieldLabel>
                  <Select
                    value={preservation}
                    disabled={busy || preserved.isPending}
                    onValueChange={(value) => {
                      setPreservation(value);
                      setConfirmed(null);
                      save.reset();
                    }}
                  >
                    <SelectTrigger
                      id="publication-preservation"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">添付なし</SelectItem>
                        {preserved.data?.items
                          .filter((p) => p.status === "ready")
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {displayDate(p.completed_at ?? p.created_at)}・
                              {p.files.length}ファイル
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {preserved.error ? (
                    <DataLoadError
                      resourceName="保全した添付構成"
                      onRetry={() => void preserved.refetch()}
                    />
                  ) : null}
                  {preserved.data ? (
                    <DataPagination
                      page={preservationPage}
                      pageSize={20}
                      total={preserved.data.total}
                      currentCount={preserved.data.items.length}
                      onPageChange={setPreservationPage}
                      isFetching={preserved.isFetching}
                    />
                  ) : null}
                  <FieldDescription>
                    この段階では添付一覧を確認します。ファイルの中身は元の内部固定版で確認してください。
                  </FieldDescription>
                </Field>
              ) : null}
            </FieldGroup>
            {selectedSource.error ? (
              <DataLoadError
                resourceName="選択した固定版"
                onRetry={() => void selectedSource.refetch()}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!selectedSource.data || busy}
                onClick={() => {
                  setConfirmed(null);
                  save.reset();
                  preview.mutate();
                }}
              >
                {preview.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <EyeIcon data-icon="inline-start" />
                )}
                準備する範囲を確認
              </Button>
              {uuid.test(release) ? (
                <Button asChild variant="outline">
                  <Link
                    href={`/projects/joined/${projectId}/artifact-releases?release=${release}`}
                  >
                    元の固定版と添付を確認
                  </Link>
                </Button>
              ) : null}
            </div>
            <FormApiError error={preview.error} />
            {confirmed ? (
              <div className="flex flex-col gap-3" aria-live="polite">
                <p className="font-medium">{confirmed.preview.title}</p>
                <p className="text-sm">
                  本文 {confirmed.preview.node_count}部分 / 添付{" "}
                  {confirmed.preview.files.length}件 /{" "}
                  {displayBytes(confirmed.preview.byte_size)}
                </p>
                <p className="text-xs text-muted-foreground">
                  除外する情報：{confirmed.preview.excluded_metadata.join("、")}
                  。本文やファイル内の秘密を自動判別したものではありません。
                </p>
                <div>
                  <Button
                    disabled={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    {save.isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    準備版を保存して全文を確認
                  </Button>
                </div>
                <FormApiError error={save.error} />
                <p className="text-xs text-muted-foreground">
                  通信失敗時は同じボタンで再試行できます。内容の不一致が出たときは、範囲を確認し直してください。
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTitle>準備版の新規保存を停止しています</AlertTitle>
          <AlertDescription>
            保存済みの準備版は引き続き確認できます。
          </AlertDescription>
        </Alert>
      )}
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label="保存した公開準備版"
      >
        <h2 className="text-base font-semibold">保存した公開準備版</h2>
        {listing.isPending ? (
          <Skeleton className="h-24" />
        ) : listing.error ? (
          <DataLoadError
            resourceName="公開準備版"
            onRetry={() => void listing.refetch()}
          />
        ) : listing.data.items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>準備版はまだありません</EmptyTitle>
              <EmptyDescription>
                固定した本文を選び、相手へ見せる内容を確認して保存します。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>確認する内容</TableHead>
                  <TableHead>保存日時</TableHead>
                  <TableHead>状態・操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listing.data.items.map((p) => (
                  <TableRow
                    key={p.id}
                    data-state={publication === p.id ? "selected" : undefined}
                  >
                    <TableCell className="max-w-96 whitespace-normal break-words">
                      {p.title}
                    </TableCell>
                    <TableCell>{displayDate(p.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {publicationStateLabel(p.state ?? "prepared")}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={publication === p.id}
                          onClick={() => setPublication(p.id)}
                        >
                          全文を確認
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataPagination
              page={page}
              pageSize={20}
              total={listing.data.total}
              currentCount={listing.data.items.length}
              onPageChange={setPage}
              isFetching={listing.isFetching}
            />
          </>
        )}
      </section>
      {uuid.test(publication) ? (
        <Detail
          key={`${projectId}:${publication}`}
          projectId={projectId}
          identity={publication}
          requestsEnabled={requestsEnabled}
        />
      ) : null}
    </>
  );
}

function Detail({
  projectId,
  identity,
  requestsEnabled,
}: {
  projectId: number;
  identity: string;
  requestsEnabled: boolean;
}) {
  const [fullContentReady, setFullContentReady] = useState(false);
  const [publicNodes, setPublicNodes] = useState<PublicationNodeRead[]>([]);
  const query = useQuery({
    queryKey: ["publication", projectId, identity],
    queryFn: () => readPublication(projectId, identity),
    retry: false,
    gcTime: 0,
  });
  if (query.isPending) return <Skeleton className="h-40" />;
  if (query.error)
    return (
      <DataLoadError
        resourceName="公開準備版"
        onRetry={() => void query.refetch()}
      />
    );
  const { content, internal_origin: origin } = query.data;
  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-label="選択した公開準備版"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold">
            2. {content.title}の全文を確認
          </h2>
          <p className="text-xs text-muted-foreground">
            {displayDate(content.captured_at)}時点の固定内容・
            {displayBytes(content.byte_size)}
          </p>
        </div>
        <Badge variant="secondary">
          {query.data.state === "prepared"
            ? "未公開・閲覧許可なし"
            : publicationStateLabel(query.data.state ?? "prepared")}
        </Badge>
      </div>
      <PublicationContent
        key={`${identity}:content`}
        projectId={projectId}
        publicationId={identity}
        onReady={setFullContentReady}
        onNodes={setPublicNodes}
      />
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label="公開する添付一覧"
      >
        <h3 className="text-base font-semibold">添付ファイル</h3>
        {content.files.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ファイル名</TableHead>
                <TableHead>種類・容量</TableHead>
                <TableHead>内容識別</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-80 whitespace-normal break-words">
                    {f.filename}
                  </TableCell>
                  <TableCell>
                    {f.content_type} / {displayBytes(f.byte_size)}
                  </TableCell>
                  <TableCell>
                    <code className="break-all text-xs">
                      {f.content_digest}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">添付なし</p>
        )}
        <p className="text-xs text-muted-foreground">
          ここから新しいダウンロードURLは発行しません。ファイルの本文・メタデータは元の内部固定版で確認します。
        </p>
      </section>
      <Alert>
        <AlertTitle>次に確認すること</AlertTitle>
        <AlertDescription>
          目的と受け入れ条件、設計・テストとの対応、機密情報の有無を確認してください。修正が必要なら元の内容から新しい固定版を作ります。確認後に相手と期限を指定します。
        </AlertDescription>
      </Alert>
      <GuestApprovalRequestPanel
        projectId={projectId}
        publicationId={identity}
        nodes={publicNodes}
        enabled={requestsEnabled && query.data.state === "published"}
        ready={fullContentReady}
      />
      <PublicationAccessPanel
        key={`${identity}:access`}
        projectId={projectId}
        publication={query.data}
        fullContentReady={fullContentReady}
      />
      <Button asChild variant="outline">
        <Link
          href={`/projects/joined/${projectId}/artifact-releases?release=${origin.release_id}`}
        >
          対応する内部固定版へ戻る
        </Link>
      </Button>
      <details className="text-xs text-muted-foreground">
        <summary>固定内容の識別情報</summary>
        <p className="break-all">公開内容 SHA-256: {content.public_digest}</p>
        <p>表現版: {content.projection_version}</p>
      </details>
    </section>
  );
}
