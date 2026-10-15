"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { SpecificationRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { listComments, createComment, resolveComment } from "../lib/api";
import {
  initialValues,
  reviewElementId,
  reviewPathLabel,
  specificationHref,
  specificationKeys,
} from "../lib/specification";

export function SpecificationReview({
  projectId,
  row,
  canEdit,
  target,
  onTarget,
  onNavigate,
}: {
  projectId: number;
  row: SpecificationRead;
  canEdit: boolean;
  target: string | null;
  onTarget: (path: string | null) => void;
  onNavigate: (path: string) => void;
}) {
  const cache = useQueryClient();
  const [body, setBody] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const key = [...specificationKeys.detail(projectId, row.id), "comments"];
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listComments(projectId, row.id, { page: pageParam, page_size: 100 }),
    getNextPageParam: (last, pages) =>
      last.length === 100 ? pages.length + 1 : undefined,
    retry: false,
  });
  const post = useMutation({
    mutationFn: () =>
      createComment(projectId, row.id, {
        field_path: target!,
        body,
        specification_version: row.version,
      }),
    onSuccess: async () => {
      setBody("");
      onTarget(null);
      await cache.invalidateQueries({ queryKey: key });
      toast.success("指摘を追加しました。");
    },
    onError: () =>
      void cache.invalidateQueries({
        queryKey: specificationKeys.detail(projectId, row.id),
      }),
  });
  const resolve = useMutation({
    mutationFn: ({
      id,
      version,
      is_resolved,
    }: {
      id: number;
      version: number;
      is_resolved: boolean;
    }) => resolveComment(projectId, row.id, id, { version, is_resolved }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      void cache.invalidateQueries({ queryKey: key });
    },
  });
  const comments = query.data?.pages.flatMap((page) => page) ?? [];
  const unresolved = comments.filter((item) => !item.is_resolved);
  const values = initialValues(row.kind, row);
  return (
    <section
      aria-label="設計書レビュー"
      className="flex min-w-0 flex-col gap-4"
    >
      <div>
        <h2 className="font-semibold">レビュー指摘</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.isPending
            ? "指摘の状況を読み込み中。"
            : `${query.hasNextPage ? "読み込み済みの" : ""}未解決 ${unresolved.length}件。`}
          内容の「指摘」から対象を選び、1件ずつ投稿します。
        </p>
      </div>
      {canEdit && target && (
        <form
          className="flex flex-col gap-3 border-b pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            post.mutate();
          }}
        >
          <p className="text-sm font-medium">
            指摘先: {reviewPathLabel(values, target)}
          </p>
          <Field>
            <FieldLabel htmlFor="specification-comment-body">
              確認したこと・修正してほしいこと
            </FieldLabel>
            <Textarea
              id="specification-comment-body"
              name="comment"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={5000}
              rows={4}
              placeholder="例: 入力エラー時に、どの項目を直せばよいか分かる表示を追加してください…"
              disabled={post.isPending}
            />
          </Field>
          <FormApiError error={post.error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={post.isPending}>
              {post.isPending ? "投稿中…" : "指摘を投稿"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onTarget(null)}
            >
              取消
            </Button>
          </div>
        </form>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        aria-pressed={showResolved}
        onClick={() => setShowResolved(!showResolved)}
      >
        {showResolved
          ? "未解決だけ表示"
          : `解決済みも表示（${comments.length - unresolved.length}件）`}
      </Button>
      {query.error ? (
        <DataLoadError
          resourceName="レビュー指摘"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p role="status">指摘を読み込み中…</p>
      ) : !(showResolved ? comments : unresolved).length ? (
        <p className="text-sm text-muted-foreground">
          {showResolved
            ? "指摘はまだありません。"
            : "未解決の指摘はありません。"}
        </p>
      ) : (
        (showResolved ? comments : unresolved).map((comment) => (
          <article
            key={comment.id}
            className="flex min-w-0 flex-col gap-2 border-b pb-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={comment.is_resolved ? "secondary" : "outline"}>
                {comment.is_resolved ? "解決済み" : "未解決"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {comment.author_name}・版 {comment.specification_version}・
                {formatDateTime(comment.created_at)}
              </span>
            </div>
            <Button
              type="button"
              variant="link"
              className="h-auto justify-start whitespace-normal p-0 text-left"
              onClick={() => onNavigate(comment.field_path)}
            >
              {reviewPathLabel(values, comment.field_path)}
            </Button>
            <p className="whitespace-pre-wrap break-words text-sm">
              {comment.body}
            </p>
            {comment.anchor_changed && (
              <Alert>
                <AlertTitle>指摘後に対象が変わっています</AlertTitle>
                <AlertDescription>
                  現在の内容と指摘を照らし合わせて、対応を確認してください。
                  {comment.field_snapshot && (
                    <details>
                      <summary className="cursor-pointer">
                        指摘時の内容（先頭800文字）
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs">
                        {comment.field_snapshot}
                      </p>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`${specificationHref(projectId, row.id)}/edit?focus=${encodeURIComponent(comment.field_path)}`}
                  >
                    この箇所を修正
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate({
                      id: comment.id,
                      version: comment.version,
                      is_resolved: !comment.is_resolved,
                    })
                  }
                >
                  {comment.is_resolved ? "再オープン" : "対応を確認して解決"}
                </Button>
              </div>
            )}
          </article>
        ))
      )}
      <span id={reviewElementId("review")} className="sr-only" />
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "読込中…" : "次の指摘を読み込む"}
        </Button>
      )}
    </section>
  );
}
