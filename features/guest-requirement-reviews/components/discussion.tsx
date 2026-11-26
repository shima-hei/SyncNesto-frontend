"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { CheckIcon, CornerDownRightIcon } from "lucide-react";
import { CommentIconButton } from "@/components/shared/comments/comment-thread-actions";
import { CommentContent } from "@/components/shared/comments/comment-content";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import {
  CommentComposer,
  CommentSubmit,
} from "@/components/shared/comments/comment-composer";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { correctionStatus } from "@/features/requirements/lib/requirement-workflow-review";
import type {
  RequirementReviewAnchor,
  RequirementReviewThreadActionInput,
  RequirementReviewThreadCreate,
  SharedRequirementReviewRead,
  SharedRequirementReviewThread,
} from "@/lib/api/generated/model";

import { actOnThread, addThread, listThreads, readReplies } from "../lib/api";

const pageSize = 10;

export function GuestReviewDiscussion({
  publicationId,
  requestId,
  nodeId,
  review,
  anchor,
  clearAnchor,
  onRefresh,
  onAccessError,
}: {
  publicationId: string;
  requestId: string;
  nodeId: string;
  review: SharedRequirementReviewRead;
  anchor?: RequirementReviewAnchor;
  clearAnchor: () => void;
  onRefresh: () => Promise<void>;
  onAccessError: (error: unknown) => boolean;
}) {
  const [page, setPage] = useState(1);
  const [composing, setComposing] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const bodyId = useId();
  const visibleComposer = composing || Boolean(anchor);
  const threads = useQuery({
    queryKey: [
      "shared-review-threads",
      review.authorization_revision,
      requestId,
      nodeId,
      page,
    ],
    queryFn: ({ signal }) =>
      listThreads(
        publicationId,
        requestId,
        { node_id: nodeId, page, page_size: pageSize },
        { signal },
      ),
    gcTime: 0,
    retry: false,
  });
  const create = useMutation({
    mutationFn: (input: RequirementReviewThreadCreate) =>
      addThread(publicationId, requestId, input),
    onSuccess: async () => {
      clearAnchor();
      setComposing(false);
      setDraftBody("");
      toast.success("指摘・コメントを登録しました");
      await onRefresh();
    },
    onError: (error) => {
      if (onAccessError(error)) void onRefresh();
    },
  });
  useEffect(() => {
    if (onAccessError(threads.error)) void onRefresh();
  }, [threads.error, onAccessError, onRefresh]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    const data = new FormData(event.currentTarget);
    const body = String(data.get("body") ?? "").trim();
    if (!body) return;
    create.mutate({
      version: review.version,
      node_id: nodeId,
      kind: data.get("kind") === "correction" ? "correction" : "comment",
      body,
      anchor,
    });
  }
  return (
    <aside
      aria-label="指摘・コメント"
      className="grid min-w-0 content-start gap-3 border-t pt-4 lg:col-span-2 xl:col-span-1 xl:border-s xl:border-t-0 xl:ps-5 xl:pt-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">指摘・コメント</h2>
        {review.can_discuss && !visibleComposer ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setComposing(true)}
          >
            コメントを追加
          </Button>
        ) : null}
      </div>
      {review.can_discuss && visibleComposer ? (
        <form className="min-w-0" onSubmit={submit}>
          <CommentComposer>
            <div className="grid gap-2">
              {anchor ? (
                <blockquote className="border-s-2 ps-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {anchor.quote}
                </blockquote>
              ) : null}
              {review.can_respond ? (
                <fieldset
                  className="flex flex-wrap gap-3 text-xs"
                  disabled={create.isPending}
                >
                  <legend className="sr-only">指摘の種類</legend>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="kind"
                      value="comment"
                      defaultChecked
                    />
                    コメント
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="kind" value="correction" />
                    修正依頼
                  </label>
                </fieldset>
              ) : null}
              <label htmlFor={bodyId} className="sr-only">
                指摘・コメントの内容
              </label>
              <Textarea
                id={bodyId}
                name="body"
                required
                maxLength={4000}
                readOnly={create.isPending}
                value={draftBody}
                rows={2}
                onChange={(event) => setDraftBody(event.currentTarget.value)}
                placeholder="指摘・コメントの内容"
              />
              <FormApiError error={create.error} />
              <CommentSubmit
                body={draftBody}
                pending={create.isPending}
                onCancel={() => {
                  if (create.isPending) return;
                  setComposing(false);
                  clearAnchor();
                  create.reset();
                }}
              >
                コメントを投稿
              </CommentSubmit>
            </div>
          </CommentComposer>
        </form>
      ) : null}
      {threads.error ? (
        <DataLoadError
          resourceName="指摘・コメント"
          onRetry={() => void threads.refetch()}
        />
      ) : threads.isPending ? (
        <p role="status" className="text-xs text-muted-foreground">
          読み込んでいます…
        </p>
      ) : threads.data.items.length ? (
        <ul className="grid min-w-0 gap-2">
          {threads.data.items.map((thread) => (
            <li key={thread.id}>
              <Thread
                publicationId={publicationId}
                requestId={requestId}
                revision={review.authorization_revision}
                thread={thread}
                onRefresh={onRefresh}
                onAccessError={onAccessError}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          この箇所に登録した指摘・コメントはありません。
        </p>
      )}
      {threads.data && (threads.data.total > pageSize || page > 1) ? (
        <DataPagination
          page={page}
          pageSize={pageSize}
          total={threads.data.total}
          currentCount={threads.data.items.length}
          onPageChange={setPage}
        />
      ) : null}
    </aside>
  );
}

function Thread({
  publicationId,
  requestId,
  revision,
  thread,
  onRefresh,
  onAccessError,
}: {
  publicationId: string;
  requestId: string;
  revision: string;
  thread: SharedRequirementReviewThread;
  onRefresh: () => Promise<void>;
  onAccessError: (error: unknown) => boolean;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [replyPage, setReplyPage] = useState(1);
  const [action, setAction] = useState<"reply" | "reopen" | null>(null);
  const inputId = useId();
  const replies = useQuery({
    queryKey: ["shared-review-replies", revision, thread.id, replyPage],
    queryFn: ({ signal }) =>
      readReplies(
        publicationId,
        requestId,
        thread.id,
        { page: replyPage, page_size: pageSize },
        { signal },
      ),
    enabled: expanded,
    gcTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (input: RequirementReviewThreadActionInput) =>
      actOnThread(publicationId, requestId, thread.id, input),
    onSuccess: async () => {
      setAction(null);
      await onRefresh();
    },
    onError: (error) => {
      if (onAccessError(error)) void onRefresh();
    },
  });
  useEffect(() => {
    if (onAccessError(replies.error)) void onRefresh();
  }, [replies.error, onAccessError, onRefresh]);
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || mutation.isPending) return;
    const body = String(
      new FormData(event.currentTarget).get("reply") ?? "",
    ).trim();
    if (body) mutation.mutate({ action, body, version: thread.version });
  }
  return (
    <div className="min-w-0 border-b py-2">
      <CommentMessage
        author={user?.name ?? "ご自身"}
        avatarUrl={user?.avatar_url}
        createdAt={thread.created_at}
        menu={
          thread.kind === "correction" ? (
            <Badge variant="outline">{correctionStatus[thread.status]}</Badge>
          ) : null
        }
      >
        <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
          <CommentContent body={thread.body} />
        </p>
        <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-medium">
            返信・対応
          </summary>
          <div className="grid gap-2 pt-2">
            {replies.error ? (
              <DataLoadError
                resourceName="返信"
                onRetry={() => void replies.refetch()}
              />
            ) : replies.data?.items.length ? (
              <ul className="grid gap-2">
                {replies.data.items.map((body, index) => (
                  <li
                    key={index}
                    className="border-s ps-2 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
                  >
                    <CommentContent body={body} />
                  </li>
                ))}
              </ul>
            ) : replies.data ? (
              <p className="text-xs text-muted-foreground">
                返信はまだありません。
              </p>
            ) : null}
            {replies.data &&
            (replies.data.total > pageSize || replyPage > 1) ? (
              <DataPagination
                page={replyPage}
                pageSize={pageSize}
                total={replies.data.total}
                currentCount={replies.data.items.length}
                onPageChange={setReplyPage}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {thread.available_actions.includes("reply") ? (
                <CommentIconButton
                  label="返信"
                  onClick={() => setAction("reply")}
                >
                  <CornerDownRightIcon aria-hidden="true" />
                </CommentIconButton>
              ) : null}
              {thread.available_actions.includes("resolve") ? (
                <CommentIconButton
                  label="解決する"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      action: "resolve",
                      version: thread.version,
                    })
                  }
                >
                  <CheckIcon aria-hidden="true" />
                </CommentIconButton>
              ) : null}
              {thread.available_actions.includes("reopen") ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAction("reopen")}
                >
                  再対応を依頼
                </Button>
              ) : null}
            </div>
            {action ? (
              <form onSubmit={send} className="grid gap-2">
                <label htmlFor={inputId} className="text-xs font-medium">
                  {action === "reply" ? "返信内容" : "再対応が必要な理由"}
                </label>
                <Textarea
                  id={inputId}
                  name="reply"
                  required
                  maxLength={4000}
                  readOnly={mutation.isPending}
                />
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                  保存
                </Button>
              </form>
            ) : null}
            <FormApiError error={mutation.error} />
          </div>
        </details>
      </CommentMessage>
    </div>
  );
}
