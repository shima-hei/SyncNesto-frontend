"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateDocument,
  canUpdateDocument,
  canDeleteDocument,
  canReviewRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import { formatDateTime } from "@/lib/format/date";
import type {
  SpecificationRead,
  SpecificationReadStatus,
} from "@/lib/api/generated/model";
import {
  readSpecification,
  updateStatus,
  deleteSpecification,
  listRevisions,
  readRevision,
} from "../lib/api";
import {
  initialValues,
  kindLabels,
  reviewElementId,
  specificationHref,
  specificationKeys,
  statusLabels,
  type Kind,
} from "../lib/specification";
import { SpecificationForm } from "./specification-form";
import { SpecificationFields } from "./specification-fields";
import { SpecificationReview } from "./specification-review";
import { SpecificationLinks } from "./specification-links";
import { RelatedSpecifications } from "./related-specifications";

export function SpecificationPage({
  projectId,
  id,
  mode = "view",
  kind = "api",
}: {
  projectId: number;
  id?: number;
  mode?: "create" | "view" | "edit";
  kind?: Kind;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const cache = useQueryClient();
  const { currentProjectRole, isLoading: roleLoading } =
    useCurrentProjectRole(projectId);
  const [tab, setTab] = useUrlTabState({
    values: ["content", "links", "review", "history"] as const,
    defaultValue: "content",
  });
  const [target, setTarget] = useState<string | null>(null);
  const [focusedTarget, setFocusedTarget] = useState<{ path: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({
    queryKey: specificationKeys.detail(projectId, id ?? 0),
    queryFn: () => readSpecification(projectId, id!),
    enabled: Boolean(id),
    retry: false,
  });
  const history = useQuery({
    queryKey: [...specificationKeys.detail(projectId, id ?? 0), "history"],
    queryFn: () => listRevisions(projectId, id!),
    enabled: Boolean(id) && tab === "history",
    retry: false,
  });
  const [pastNumber, setPastNumber] = useState<number | null>(null);
  const pastQuery = useQuery({
    queryKey: [
      ...specificationKeys.detail(projectId, id ?? 0),
      "revision",
      pastNumber,
    ],
    queryFn: () => readRevision(projectId, id!, pastNumber!),
    enabled: Boolean(id && pastNumber && tab === "history"),
    retry: false,
  });
  const past = pastQuery.data?.snapshot as unknown as
    SpecificationRead | undefined;
  const row = query.data;
  const canEdit = canUpdateDocument(currentProjectRole);
  const changeStatus = useMutation({
    mutationFn: (status: SpecificationReadStatus) =>
      updateStatus(projectId, id!, { version: row!.version, status }),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: specificationKeys.detail(projectId, id!),
      });
      void cache.invalidateQueries({
        queryKey: specificationKeys.all(projectId),
      });
      toast.success("確認状況を更新しました。");
    },
    onError: () =>
      void cache.invalidateQueries({
        queryKey: specificationKeys.detail(projectId, id!),
      }),
  });
  const remove = useMutation({
    mutationFn: () =>
      deleteSpecification(projectId, id!, { version: row!.version }),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: specificationKeys.all(projectId),
      });
      toast.success("設計書をごみ箱へ移動しました。");
      router.push(specificationHref(projectId));
    },
  });
  const jump = (path: string) => {
    setTab("content");
    setFocusedTarget({ path });
  };
  useEffect(() => {
    if (tab !== "content" || !focusedTarget) return;
    // TabsContent mounts its children through Presence; wait for that commit.
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(
        reviewElementId(focusedTarget.path),
      );
      if (!element) {
        toast.info(
          "この指摘の対象項目は削除されています。レビュー指摘から内容を確認してください。",
        );
        return;
      }
      element.closest("details")?.setAttribute("open", "");
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, focusedTarget]);
  useEffect(() => {
    if (target) document.getElementById("specification-comment-body")?.focus();
  }, [target]);
  if (roleLoading || (id && query.isPending))
    return <p role="status">設計書を読み込み中…</p>;
  if (query.error)
    return (
      <DataLoadError
        resourceName="設計書"
        isRetrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  if (
    mode !== "view" &&
    !(mode === "create" ? canCreateDocument(currentProjectRole) : canEdit)
  )
    return <p role="alert">設計書を編集する権限がありません。</p>;
  if (mode === "create" || mode === "edit")
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title={
            mode === "create"
              ? `${kindLabels[kind]}を作成`
              : `${kindLabels[row!.kind]}を編集`
          }
          description={
            mode === "create"
              ? "要件を読み、必要な項目から具体化します。"
              : "指摘を確認し、変更理由が伝わる内容に修正します。"
          }
        />
        <SpecificationForm
          key={row?.id ?? kind}
          projectId={projectId}
          row={row}
          kind={row?.kind ?? kind}
        />
      </div>
    );
  if (!row) return null;
  const review = (
    <SpecificationReview
      projectId={projectId}
      row={row}
      canEdit={canEdit}
      target={target}
      onTarget={setTarget}
      onNavigate={jump}
    />
  );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title={row.title}
        description={`${kindLabels[row.kind]}・版 ${row.version}・更新 ${formatDateTime(row.updated_at)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={specificationHref(projectId)}>設計書一覧へ</Link>
            </Button>
            {canEdit && (
              <Button asChild>
                <Link href={`${specificationHref(projectId, id)}/edit`}>
                  内容を編集
                </Link>
              </Button>
            )}
            {canDeleteDocument(currentProjectRole) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleting(true)}
              >
                削除
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={row.status === "approved" ? "secondary" : "outline"}>
          {statusLabels[row.status]}
        </Badge>
        {canEdit && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={changeStatus.isPending || row.status === "in_review"}
              onClick={() => changeStatus.mutate("in_review")}
            >
              レビューを依頼
            </Button>
            {canReviewRequirement(currentProjectRole) && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate("changes_requested")}
                >
                  修正を依頼
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={changeStatus.isPending || row.status === "approved"}
                  onClick={() => changeStatus.mutate("approved")}
                >
                  確認して承認
                </Button>
              </>
            )}
            {row.status !== "draft" && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={changeStatus.isPending}
                onClick={() => changeStatus.mutate("draft")}
              >
                下書きに戻す
              </Button>
            )}
          </>
        )}
      </div>
      <FormApiError error={changeStatus.error} />
      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList variant="line" className="max-w-full">
          <TabsTrigger value="content">設計内容</TabsTrigger>
          <TabsTrigger value="links">関連</TabsTrigger>
          <TabsTrigger value="review">レビュー指摘</TabsTrigger>
          <TabsTrigger value="history">版履歴</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <SpecificationFields
              values={initialValues(row.kind, row)}
              onChange={() => undefined}
              readOnly
              onReview={canEdit ? (path) => setTarget(path) : undefined}
            />
            <aside className="min-w-0 border-t pt-5 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:border-t-0 xl:pt-0">
              {review}
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="links">
          <div className="flex flex-col gap-6">
            <SpecificationLinks
              projectId={projectId}
              id={row.id}
              canEdit={canEdit}
            />
            <RelatedSpecifications
              projectId={projectId}
              targetType="specification"
              targetId={String(row.id)}
            />
          </div>
        </TabsContent>
        <TabsContent value="review">
          <div className="max-w-3xl">{review}</div>
        </TabsContent>
        <TabsContent value="history">
          <div className="flex max-w-4xl flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              最新100版を表示します。過去版の表示で現在の内容は変更されません。
            </p>
            {history.isPending ? (
              <p role="status">版履歴を読み込み中…</p>
            ) : history.error ? (
              <DataLoadError
                resourceName="版履歴"
                isRetrying={history.isFetching}
                onRetry={() => void history.refetch()}
              />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {history.data?.map((revision) => (
                  <li key={revision.number}>
                    <Button
                      type="button"
                      variant={
                        past?.version === revision.number
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setPastNumber(revision.number)}
                    >
                      版 {revision.number}（
                      {formatDateTime(revision.created_at)}）
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {pastQuery.isFetching && <p role="status">過去版を読み込み中…</p>}
            {pastQuery.error && (
              <DataLoadError
                resourceName="過去版"
                isRetrying={pastQuery.isFetching}
                onRetry={() => void pastQuery.refetch()}
              />
            )}
            {past && (
              <section className="flex flex-col gap-5 border-t pt-5">
                <h2 className="font-semibold">版 {past.version}の内容</h2>
                <SpecificationFields
                  key={past.version}
                  values={initialValues(past.kind, past)}
                  onChange={() => undefined}
                  readOnly
                />
              </section>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="設計書を削除しますか？"
        description="既存のごみ箱へ移動します。通常データは保持期限内に復元できます。"
        confirmLabel="ごみ箱へ移動"
        destructive
        isPending={remove.isPending}
        onConfirm={() => remove.mutateAsync()}
      />
      <FormApiError error={remove.error} />
      {params.get("source") && (
        <span className="sr-only">関連元を指定して作成</span>
      )}
    </div>
  );
}
