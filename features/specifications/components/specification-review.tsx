"use client";

import { useState } from "react";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { CommentContent } from "@/components/shared/comments/comment-content";
import {
  CommentComposeTools,
  useCommentComposeMedia,
} from "@/components/shared/comments/comment-compose-media";
import { CommentIconButton } from "@/components/shared/comments/comment-thread-actions";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { SpecificationRead } from "@/lib/api/generated/model";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import {
  CommentComposer,
  CommentSubmit,
} from "@/components/shared/comments/comment-composer";
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
  const media = useCommentComposeMedia(projectId, "specification");
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
    mutationFn: (imageIds: string[]) =>
      createComment(projectId, row.id, {
        field_path: target!,
        body,
        specification_version: row.version,
        image_ids: imageIds.length ? imageIds : undefined,
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
          {...media.formEvents}
          onSubmit={(event) => {
            event.preventDefault();
            if (!body.trim() || post.isPending) return;
            void media
              .send(async (ids) => {
                await post.mutateAsync(ids);
              })
              .catch(() => undefined);
          }}
        >
          <p className="text-sm font-medium">
            指摘先: {reviewPathLabel(values, target)}
          </p>
          <CommentComposer>
            <div className="flex flex-col gap-2">
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
                  className="max-h-32 resize-none overflow-y-auto"
                  maxLength={5000}
                  rows={2}
                  placeholder="例: 入力エラー時に、どの項目を直せばよいか分かる表示を追加してください…"
                  disabled={post.isPending || media.sending}
                />
              </Field>
              <FormApiError error={post.error} />
              <CommentComposeTools
                media={media}
                body={body}
                editor={() =>
                  document.getElementById(
                    "specification-comment-body",
                  ) as HTMLTextAreaElement | null
                }
                onLinkChange={({ value }) => setBody(value)}
              >
                <CommentSubmit
                  body={body}
                  pending={post.isPending || media.sending}
                  onCancel={() => onTarget(null)}
                >
                  指摘を投稿
                </CommentSubmit>
              </CommentComposeTools>
            </div>
          </CommentComposer>
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
          <div key={comment.id} className="min-w-0 border-b py-3">
            <CommentMessage
              author={comment.author_name}
              avatarUrl={comment.author_avatar_url}
              images={comment.images}
              createdAt={comment.created_at}
              resolved={comment.is_resolved}
            >
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start whitespace-normal p-0 text-left"
                onClick={() => onNavigate(comment.field_path)}
              >
                {reviewPathLabel(values, comment.field_path)}
              </Button>
              <p className="whitespace-pre-wrap break-words text-sm">
                <CommentContent body={comment.body} />
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
                  <CommentIconButton
                    label={
                      comment.is_resolved ? "再オープン" : "対応を確認して解決"
                    }
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({
                        id: comment.id,
                        version: comment.version,
                        is_resolved: !comment.is_resolved,
                      })
                    }
                  >
                    {comment.is_resolved ? (
                      <RotateCcwIcon aria-hidden="true" />
                    ) : (
                      <CheckIcon aria-hidden="true" />
                    )}
                  </CommentIconButton>
                </div>
              )}
            </CommentMessage>
          </div>
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
