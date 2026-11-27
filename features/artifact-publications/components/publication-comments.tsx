"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  CommentComposer,
  CommentSubmit,
} from "@/components/shared/comments/comment-composer";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import { MentionEditor } from "@/components/shared/comments/mention-textarea";
import { LinkInsertPopover } from "@/components/shared/smart-links/link-insert-popover";
import {
  CommentAttachButton,
  CommentDraftFileList,
} from "@/components/shared/comments/comment-compose-media";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  PublicationNodeRead,
  RequirementReviewAnchor,
  SharedCommentMentionOccurrence,
  SharedPublicationCommentCreate,
} from "@/lib/api/generated/model";
import {
  publicationSharedCommentsProjectsProjectIdArtifactPublicationsPublicationIdCommentsGet as listInternal,
  addPublicationSharedCommentProjectsProjectIdArtifactPublicationsPublicationIdCommentsPost as postInternal,
  publicationCommentMentionCandidatesProjectsProjectIdArtifactPublicationsPublicationIdCommentsMentionCandidatesGet as internalCandidates,
} from "@/lib/api/generated/publication-access/publication-access";
import {
  sharedPublicationCommentsSharedPublicationsPublicationIdCommentsGet as listShared,
  addSharedPublicationCommentSharedPublicationsPublicationIdCommentsPost as postShared,
  sharedCommentMentionCandidatesSharedPublicationsPublicationIdCommentsMentionCandidatesGet as sharedCandidates,
} from "@/lib/api/generated/shared-publications/shared-publications";
import { reconcileMentions } from "@/lib/comments/mentions";
import { useFreshShared } from "../hooks/use-fresh-shared";
import { loadSharedLinkTitles } from "../lib/shared-comment-links";
import { sharedPublicationLinkId } from "@/lib/smart-links/reference";
import { SharedCommentBody } from "./shared-comment-body";
import {
  SharedCommentFiles,
  commentPath,
  sharedCommentFileAccept,
  useSharedCommentFileDraft,
} from "./shared-comment-files";
import {
  publicationQuoteFields,
  publicationQuoteId,
  publicationQuoteLabels,
  quoteFromTextarea,
  type PublicationQuote,
} from "../lib/publication-quote";

type Context = {
  publicationId: string;
  projectId?: number;
  threadId?: string;
  nodes?: PublicationNodeRead[];
  quote?: PublicationQuote;
  onQuoteChange?: (quote: PublicationQuote | undefined) => void;
  onCanPostChange?: (canPost: boolean) => void;
};

export function PublicationComments(props: Context) {
  const section = useRef<HTMLElement>(null);
  const { projectId, publicationId, threadId } = props;
  useEffect(() => {
    if (threadId && window.location.hash === "#shared-comments") {
      section.current?.focus({ preventScroll: true });
      section.current?.scrollIntoView({ block: "start" });
    }
  }, [threadId]);
  return (
    <section
      ref={section}
      tabIndex={-1}
      className="grid min-w-0 gap-4 border-t pt-4"
      id="shared-comments"
      aria-label="共有コメント"
    >
      <h2 className="text-base font-semibold">共有コメント</h2>
      {threadId && (
        <Link
          href={
            projectId
              ? `/projects/joined/${projectId}/artifact-publications?publication=${publicationId}&view=discussion#shared-comments`
              : `/shared/publications/${publicationId}#shared-comments`
          }
          prefetch={false}
          className="text-sm underline underline-offset-4"
        >
          すべての共有コメント
        </Link>
      )}
      <CommentPage key={props.threadId ?? "all"} {...props} />
    </section>
  );
}

function CommentPage({
  publicationId,
  projectId,
  nodes,
  quote,
  onQuoteChange,
  onCanPostChange,
  parentId,
  threadId,
}: Context & { parentId?: string }) {
  const [page, setPage] = useState(1);
  const [replies, setReplies] = useState<string | null>(threadId ?? null);
  const root = useRef<HTMLDivElement>(null);
  const pageSize = 15;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const params = {
        page,
        page_size: pageSize,
        parent_id: parentId,
        thread_id: threadId,
      };
      const comments = projectId
        ? await listInternal(projectId, publicationId, params, { signal })
        : await listShared(publicationId, params, { signal });
      return {
        ...comments,
        titles: projectId
          ? []
          : await loadSharedLinkTitles(comments.items, signal),
      };
    },
    [projectId, publicationId, parentId, threadId, page],
  );
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const { value, error, refresh, operationSignal } = useFreshShared(
    JSON.stringify([projectId, publicationId, parentId, threadId, page]),
    load,
    mask,
  );
  const canPost = value?.can_post === true;
  useEffect(() => {
    onCanPostChange?.(canPost);
    return () => onCanPostChange?.(false);
  }, [canPost, onCanPostChange]);
  useEffect(() => {
    if (!value) return;
    const deadlines = value.titles.map((title) => Date.parse(title.expires_at));
    if (value.expires_at) deadlines.push(Date.parse(value.expires_at));
    if (!deadlines.length) return;
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(Math.min(...deadlines) - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);
  return (
    <div ref={root} className="grid min-w-0 gap-3">
      {error ? (
        <DataLoadError
          resourceName="共有コメント"
          onRetry={() => void refresh()}
        />
      ) : !value ? (
        <Skeleton className="h-14" />
      ) : (
        <>
          {value.items.length ? (
            <ul className="grid gap-3 divide-y">
              {value.items.map((comment) => (
                <li
                  key={comment.id}
                  id={`shared-comment-${comment.id}`}
                  className="grid min-w-0 gap-2 pb-3"
                >
                  <CommentMessage
                    author={comment.author_label}
                    createdAt={comment.created_at}
                    reply={Boolean(parentId)}
                  >
                    {comment.anchor && (
                      <blockquote className="border-s-2 ps-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {comment.anchor.quote}
                      </blockquote>
                    )}
                    {comment.node_id && (
                      <Link
                        href={
                          comment.anchor
                            ? `#${publicationQuoteId(comment.node_id, comment.anchor.field)}`
                            : `#public-node-${comment.node_id}`
                        }
                        className="self-start text-xs underline underline-offset-4"
                      >
                        固定本文の該当箇所
                      </Link>
                    )}
                    <SharedCommentBody
                      body={comment.body}
                      mentions={comment.mentions}
                      titles={value.titles}
                      internal={Boolean(projectId)}
                    />
                    <SharedCommentFiles
                      base={`${commentPath(publicationId, projectId)}/${comment.id}`}
                      files={comment.attachments}
                      downloadAllowed={value.download_allowed ?? true}
                      signal={operationSignal}
                    />
                  </CommentMessage>
                  {!parentId && (
                    <div className="grid min-w-0 gap-2 pl-9">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        aria-expanded={replies === comment.id}
                        onClick={() =>
                          setReplies(replies === comment.id ? null : comment.id)
                        }
                      >
                        {replies === comment.id ? "返信を閉じる" : "返信を表示"}
                      </Button>
                      {replies === comment.id && (
                        <CommentPage
                          key={comment.id}
                          publicationId={publicationId}
                          projectId={projectId}
                          parentId={comment.id}
                        />
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              message={
                parentId ? "返信はありません" : "共有コメントはありません"
              }
            />
          )}
          {value.total > pageSize && (
            <DataPagination
              page={page}
              pageSize={pageSize}
              currentCount={value.items.length}
              total={value.total}
              onPageChange={setPage}
            />
          )}
          {value.can_post && !threadId && (
            <SharedCommentForm
              publicationId={publicationId}
              projectId={projectId}
              parentId={parentId}
              nodes={nodes}
              quote={quote}
              onQuoteChange={onQuoteChange}
              signal={operationSignal}
              onSaved={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}

function SharedCommentForm({
  publicationId,
  projectId,
  parentId,
  nodes,
  quote,
  onQuoteChange,
  signal,
  onSaved,
}: Context & {
  parentId?: string;
  signal?: AbortSignal;
  onSaved: () => Promise<void>;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<SharedCommentMentionOccurrence[]>(
    [],
  );
  const [selectedNode, setSelectedNode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState<PublicationQuote>();
  const [error, setError] = useState<Error>();
  const last = useRef<SharedPublicationCommentCreate | undefined>(undefined);
  const currentQuote = useRef(quote);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nodeId = quote?.nodeId ?? (selectedNode || undefined);
  const node = nodes?.find((node) => node.id === nodeId);
  const confirmedNow = confirmed && confirmedQuote === quote;
  const media = useSharedCommentFileDraft(
    commentPath(publicationId, projectId),
    signal,
    () => setConfirmed(false),
  );
  const pending = media.sending;
  function edit(value: string, nextMentions: SharedCommentMentionOccurrence[]) {
    setBody(value);
    setMentions(nextMentions);
    setConfirmed(false);
  }
  useEffect(() => {
    currentQuote.current = quote;
    if (quote) textarea.current?.focus();
  }, [quote]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (pending || !content || !confirmedNow || !signal || signal.aborted)
      return;
    setError(undefined);
    const leading = body.length - body.trimStart().length;
    const normalizedMentions = mentions.map((mention) => ({
      ...mention,
      start: mention.start - leading,
      end: mention.end - leading,
    }));
    await media.send(async (attachmentIds) => {
      if (signal.aborted) return false;
      const data =
        last.current?.body === content &&
        last.current?.node_id === nodeId &&
        JSON.stringify(last.current?.attachment_ids ?? []) ===
          JSON.stringify(attachmentIds) &&
        JSON.stringify(last.current?.mentions ?? []) ===
          JSON.stringify(normalizedMentions) &&
        JSON.stringify(last.current?.anchor ?? null) ===
          JSON.stringify(quote?.anchor ?? null)
          ? last.current
          : {
              request_id: crypto.randomUUID(),
              body: content,
              parent_id: parentId,
              node_id: nodeId,
              anchor: quote?.anchor,
              attachment_ids: attachmentIds,
              mentions: normalizedMentions,
            };
      last.current = data;
      try {
        if (projectId)
          await postInternal(projectId, publicationId, data, { signal });
        else await postShared(publicationId, data, { signal });
      } catch (reason) {
        if (!signal.aborted)
          setError(
            reason instanceof Error
              ? reason
              : new Error("投稿できませんでした"),
          );
        return false;
      }
      last.current = undefined;
      setBody("");
      setMentions([]);
      setConfirmed(false);
      if (currentQuote.current === quote) onQuoteChange?.(undefined);
      await onSaved();
    });
  }
  const label = parentId ? "共有スレッドに返信" : "共有コメントを投稿";
  return (
    <CommentComposer>
      <form
        className="grid gap-2"
        {...media.formEvents}
        onSubmit={(event) => void submit(event)}
      >
        <Field>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <MentionEditor
            id={id}
            inputRef={textarea}
            value={body}
            mentions={mentions}
            onChange={edit}
            candidateKey={["shared-comment-mentions", projectId, publicationId]}
            signal={signal}
            loadCandidates={(q, signal) =>
              projectId
                ? internalCandidates(
                    projectId,
                    publicationId,
                    { q },
                    { signal },
                  )
                : sharedCandidates(publicationId, { q }, { signal })
            }
            makeMention={(candidate, offsets) => ({
              ...offsets,
              recipient_id: candidate.id,
            })}
            aria-label={label}
            required
            maxLength={4000}
            disabled={pending}
          />
        </Field>
        {!parentId && nodes && nodes.length > 0 && (
          <Field>
            <FieldLabel htmlFor={id + "-node"}>対象箇所</FieldLabel>
            <select
              className="max-w-full rounded-md border bg-background p-2 text-sm"
              id={id + "-node"}
              name="node"
              disabled={pending}
              value={nodeId ?? ""}
              onChange={(event) => {
                setSelectedNode(event.target.value);
                setConfirmed(false);
                onQuoteChange?.(undefined);
              }}
            >
              <option value="">資料全体</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {typeof node.payload.title === "string"
                    ? node.payload.title
                    : `本文 ${node.ordinal + 1}`}
                </option>
              ))}
            </select>
          </Field>
        )}
        {quote ? (
          <div className="grid min-w-0 gap-2">
            <blockquote className="border-s-2 ps-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
              {quote.anchor.quote}
            </blockquote>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-self-start"
              disabled={pending}
              onClick={() => {
                setSelectedNode(quote.nodeId);
                onQuoteChange?.(undefined);
                setConfirmed(false);
                textarea.current?.focus();
              }}
            >
              引用を外す
            </Button>
          </div>
        ) : node && onQuoteChange ? (
          <QuotePicker
            key={node.id}
            node={node}
            disabled={pending}
            onQuote={onQuoteChange}
          />
        ) : null}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CommentAttachButton
            media={media}
            label="画像やファイルを添付"
            accept={sharedCommentFileAccept}
          />
          1件3 MiB・4件まで
          <LinkInsertPopover
            iconOnly
            editor={() => textarea.current}
            disabled={pending}
            autoTitleForUrl={
              projectId
                ? undefined
                : (href) =>
                    Boolean(
                      sharedPublicationLinkId(href, window.location.origin),
                    )
            }
            onChange={({ value, start, end }) =>
              edit(
                value,
                reconcileMentions(body, value, mentions, { start, end }),
              )
            }
          />
        </div>
        <CommentDraftFileList media={media} label="投稿前の添付ファイル" />
        <Field orientation="horizontal">
          <Checkbox
            id={id + "-confirm"}
            checked={confirmedNow}
            onCheckedChange={(value) => {
              setConfirmed(value === true);
              setConfirmedQuote(quote);
            }}
            disabled={pending}
          />
          <FieldLabel htmlFor={id + "-confirm"}>
            {media.images.length
              ? "本文と添付を、この固定版を閲覧できる参加者に共有します"
              : "この固定版を閲覧できる参加者との共有を確認しました"}
          </FieldLabel>
        </Field>
        <FormApiError error={error} />
        <CommentSubmit pending={pending} body={confirmedNow ? body : ""}>
          <span>{label}</span>
        </CommentSubmit>
      </form>
    </CommentComposer>
  );
}

function QuotePicker({
  node,
  onQuote,
  disabled,
}: {
  node: PublicationNodeRead;
  onQuote: (quote: PublicationQuote) => void;
  disabled: boolean;
}) {
  const fields = (publicationQuoteFields[node.node_kind] ?? []).filter(
    (field) => {
      const value = node.payload[field];
      return typeof value === "string" && value.trim();
    },
  );
  const [field, setField] = useState(fields[0] ?? "");
  const [anchor, setAnchor] = useState<RequirementReviewAnchor>();
  if (!fields.length) return null;
  const value = String(node.payload[field] ?? "");
  return (
    <details className="text-sm">
      <summary className="cursor-pointer">固定本文から引用</summary>
      <div className="mt-2 grid gap-2">
        <label className="grid gap-1">
          引用する項目
          <select
            className="rounded-md border bg-background p-2"
            value={field}
            disabled={disabled}
            onChange={(event) => {
              setField(event.target.value);
              setAnchor(undefined);
            }}
          >
            {fields.map((key) => (
              <option key={key} value={key}>
                {publicationQuoteLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          引用する本文の範囲を選択
          <Textarea
            readOnly
            value={value}
            onSelect={(event) => {
              setAnchor(
                quoteFromTextarea(field, value, event.currentTarget) ??
                  undefined,
              );
            }}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="justify-self-start"
          disabled={disabled || !anchor}
          onClick={() => anchor && onQuote({ nodeId: node.id, anchor })}
        >
          選択した箇所を引用
        </Button>
      </div>
    </details>
  );
}
