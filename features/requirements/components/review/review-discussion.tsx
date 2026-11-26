import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, MessageSquarePlusIcon } from "lucide-react";
import { toast } from "sonner";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  correctionStatus,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import type {
  ArtifactNodeRead,
  RequirementReviewAnchor,
  RequirementReviewThreadActionInput,
  RequirementReviewThreadCreate,
  RequirementReviewThreadRead,
} from "@/lib/api/generated/model";
import {
  actOnWorkflowReviewThreadProjectsProjectIdRequirementWorkflowRequestIdReviewThreadsThreadIdActionsPost as actOnThread,
  createWorkflowReviewThreadProjectsProjectIdRequirementWorkflowRequestIdReviewThreadsPost as createThread,
  listWorkflowReviewThreadsProjectsProjectIdRequirementWorkflowRequestIdReviewThreadsGet as listThreads,
  readWorkflowReviewThreadProjectsProjectIdRequirementWorkflowRequestIdReviewThreadsThreadIdGet as readThread,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import { UserDisplay } from "@/components/shared/display/user-avatar";

const actionLabels = {
  reply: "返信",
  start: "対応を開始",
  respond: "回答して再確認を依頼",
  reopen: "再対応を依頼",
  resolve: "解決する",
  force_resolve: "理由を記録して終了",
};
const activityLabels = {
  reply: "返信しました",
  start: "対応を開始しました",
  respond: "回答して再確認を依頼しました",
  reopen: "再対応を依頼しました",
  resolve: "解決しました",
  force_resolve: "理由を記録して終了しました",
};
const requiresMessage = new Set([
  "reply",
  "respond",
  "reopen",
  "force_resolve",
]);

export type DiscussionDraft = {
  kind: RequirementReviewThreadCreate["kind"];
  anchor?: RequirementReviewAnchor;
};

type DiscussionContext = {
  projectId: number;
  requestId: string;
  queryKey: readonly unknown[];
  actorName: (id: number) => string;
  refresh: () => Promise<unknown>;
};

export function ReviewDiscussion({
  projectId,
  requestId,
  queryKey,
  actorName,
  refresh,
  node,
  initialThreadId,
  version,
  canDiscuss,
  canCorrect,
  draft,
  onDraft,
  onHighlight,
}: DiscussionContext & {
  node: ArtifactNodeRead;
  initialThreadId?: string;
  version: number;
  canDiscuss: boolean;
  canCorrect: boolean;
  draft: DiscussionDraft | null;
  onDraft: (draft: DiscussionDraft | null) => void;
  onHighlight: (field: string, quote: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(
    initialThreadId ?? null,
  );
  const focusedThread = useRef<HTMLLIElement>(null);
  const hasFocused = useRef(false);
  const bodyId = useId();
  const pageSize = 12;
  const threads = useQuery({
    queryKey: [...queryKey, "threads", node.id, page],
    queryFn: ({ signal }) =>
      listThreads(
        projectId,
        requestId,
        { node_id: node.id, page, page_size: pageSize },
        { signal },
      ),
    retry: false,
  });
  const linkedThread = useQuery({
    queryKey: [...queryKey, "thread", initialThreadId, 1],
    queryFn: ({ signal }) =>
      readThread(
        projectId,
        requestId,
        initialThreadId!,
        { page: 1, page_size: 10 },
        { signal },
      ),
    enabled: Boolean(initialThreadId),
    retry: false,
  });
  const items = threads.data?.items ?? [];
  const linked = linkedThread.data?.thread;
  const displayedItems =
    page === 1 &&
    linked?.node_id === node.id &&
    !items.some((item) => item.id === linked.id)
      ? [linked, ...items]
      : items;
  const linkedVisible = displayedItems.some(
    (item) => item.id === initialThreadId,
  );
  useEffect(() => {
    if (linkedVisible && focusedThread.current && !hasFocused.current) {
      hasFocused.current = true;
      focusedThread.current.focus({ preventScroll: true });
      focusedThread.current.scrollIntoView({ block: "nearest" });
    }
  }, [linkedVisible]);
  const create = useMutation({
    mutationFn: (data: RequirementReviewThreadCreate) =>
      createThread(projectId, requestId, data),
    onSuccess: (thread) => {
      setPage(1);
      setExpanded(thread.id);
      onDraft(null);
      toast.success(
        thread.kind === "correction"
          ? "修正を依頼しました"
          : "コメントを追加しました",
      );
    },
    onSettled: refresh,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || create.isPending) return;
    const values = new FormData(event.currentTarget);
    const body = String(values.get("body") ?? "").trim();
    if (!body) return;
    const kind = values.get("kind") === "correction" ? "correction" : "comment";
    create.mutate({
      node_id: node.id,
      version,
      kind,
      body,
      anchor: draft.anchor,
    });
  }

  return (
    <div className="grid min-w-0 gap-4">
      {canDiscuss && draft ? (
        <form
          className="grid min-w-0 gap-3 rounded-lg border bg-muted/35 p-3"
          onSubmit={submit}
        >
          <div>
            <p className="text-sm font-semibold">{reviewTargetTitle(node)}</p>
            {draft.anchor ? (
              <blockquote className="mt-2 border-s-2 ps-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {draft.anchor.quote}
              </blockquote>
            ) : null}
          </div>
          {canCorrect ? (
            <fieldset
              key={draft.kind}
              className="flex flex-wrap gap-x-3 gap-y-2 text-sm"
              disabled={create.isPending}
            >
              <legend className="sr-only">コメントの種類</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="comment"
                  defaultChecked={draft.kind === "comment"}
                />
                コメント
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="correction"
                  defaultChecked={draft.kind === "correction"}
                />
                修正依頼
              </label>
            </fieldset>
          ) : null}
          <label htmlFor={bodyId} className="sr-only">
            コメント・指摘の内容
          </label>
          <Textarea
            id={bodyId}
            name="body"
            required
            maxLength={4000}
            placeholder="コメント・指摘の内容"
            readOnly={create.isPending}
          />
          <FormApiError
            error={create.error}
            fallbackMessage="保存できませんでした。"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={create.isPending}
              onClick={() => {
                create.reset();
                onDraft(null);
              }}
            >
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={create.isPending}>
              {create.isPending ? "保存中…" : "送信"}
            </Button>
          </div>
        </form>
      ) : canDiscuss ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => onDraft({ kind: "comment" })}
        >
          <MessageSquarePlusIcon data-icon="inline-start" />
          コメントを追加
        </Button>
      ) : null}

      {threads.error ? (
        <DataLoadError
          resourceName="指摘・コメント"
          onRetry={() => void threads.refetch()}
        />
      ) : displayedItems.length === 0 &&
        (threads.isPending || linkedThread.isFetching) ? (
        <p className="text-sm text-muted-foreground" role="status">
          指摘・コメントを読み込んでいます…
        </p>
      ) : displayedItems.length ? (
        <ul className="grid min-w-0 gap-3">
          {displayedItems.map((thread) => (
            <li
              key={thread.id}
              ref={thread.id === initialThreadId ? focusedThread : undefined}
              tabIndex={thread.id === initialThreadId ? -1 : undefined}
              className="min-w-0 border-b py-3 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <CommentMessage
                author={actorName(thread.author_id)}
                createdAt={thread.created_at}
                menu={
                  <Badge
                    variant="outline"
                    className={
                      thread.kind === "correction" &&
                      thread.status !== "resolved"
                        ? "border-[var(--status-warning-border)] text-[var(--status-warning-fg)]"
                        : undefined
                    }
                  >
                    {thread.kind === "comment"
                      ? thread.status === "resolved"
                        ? "解決済み"
                        : "コメント"
                      : correctionStatus[thread.status]}
                  </Badge>
                }
              >
                {thread.field && thread.quote ? (
                  <button
                    type="button"
                    className="self-start max-w-full rounded-sm border-s-2 ps-2 text-start text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring [overflow-wrap:anywhere]"
                    onClick={() => onHighlight(thread.field!, thread.quote!)}
                  >
                    {thread.quote}
                  </button>
                ) : null}
                <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                  {thread.body}
                </p>
                {thread.assignee_id ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    担当 <UserDisplay name={actorName(thread.assignee_id)} />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 px-0"
                  aria-expanded={expanded === thread.id}
                  aria-controls={
                    expanded === thread.id
                      ? `review-thread-${thread.id}`
                      : undefined
                  }
                  onClick={() =>
                    setExpanded(expanded === thread.id ? null : thread.id)
                  }
                >
                  <ChevronDownIcon
                    data-icon="inline-start"
                    className={
                      expanded === thread.id ? "rotate-180" : undefined
                    }
                  />
                  履歴・返信
                </Button>
                {expanded === thread.id ? (
                  <ReviewThreadDetails
                    projectId={projectId}
                    requestId={requestId}
                    queryKey={queryKey}
                    actorName={actorName}
                    refresh={refresh}
                    threadId={thread.id}
                  />
                ) : null}
              </CommentMessage>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          この対象への指摘・コメントはありません。
        </p>
      )}
      {threads.data && threads.data.total > pageSize ? (
        <div
          className="flex items-center justify-between gap-2"
          aria-label="指摘・コメントのページ"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1 || threads.isFetching}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {Math.ceil(threads.data.total / pageSize)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              page * pageSize >= threads.data.total || threads.isFetching
            }
            onClick={() => setPage(page + 1)}
          >
            次へ
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReviewThreadDetails({
  projectId,
  requestId,
  queryKey,
  actorName,
  refresh,
  threadId,
}: DiscussionContext & { threadId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const query = useQuery({
    queryKey: [...queryKey, "thread", threadId, page],
    queryFn: ({ signal }) =>
      readThread(
        projectId,
        requestId,
        threadId,
        { page, page_size: pageSize },
        { signal },
      ),
    retry: false,
  });
  const [draft, setDraft] = useState<
    RequirementReviewThreadActionInput["action"] | null
  >(null);
  const bodyId = useId();
  const action = useMutation({
    mutationFn: (data: RequirementReviewThreadActionInput) =>
      actOnThread(projectId, requestId, threadId, data),
    onSuccess: () => {
      setDraft(null);
      toast.success("変更を記録しました");
    },
    onSettled: refresh,
  });
  const detail = query.data;
  const allowedDraft =
    draft && detail?.available_actions.includes(draft) ? draft : null;

  function submit(
    event: FormEvent<HTMLFormElement>,
    thread: RequirementReviewThreadRead,
    name: RequirementReviewThreadActionInput["action"],
  ) {
    event.preventDefault();
    const body = String(
      new FormData(event.currentTarget).get("body") ?? "",
    ).trim();
    if (!body || action.isPending) return;
    action.mutate({ action: name, body, version: thread.version });
  }

  return (
    <div
      id={`review-thread-${threadId}`}
      className="grid min-w-0 gap-3 border-t pt-3"
    >
      {query.error ? (
        <DataLoadError
          resourceName="指摘の履歴"
          onRetry={() => void query.refetch()}
        />
      ) : !detail ? (
        <p className="text-xs text-muted-foreground" role="status">
          履歴を読み込んでいます…
        </p>
      ) : (
        <>
          {detail.events.length ? (
            <ol className="grid gap-3">
              {detail.events.map((event) => (
                <li key={event.id} className="min-w-0 border-s-2 ps-2 text-sm">
                  <CommentMessage
                    author={actorName(event.actor_id)}
                    createdAt={event.created_at}
                    reply
                  >
                    <p className="font-medium">
                      {activityLabels[event.action]}
                    </p>
                    {event.body ? (
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {event.body}
                      </p>
                    ) : null}
                  </CommentMessage>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">
              返信・対応履歴はまだありません。
            </p>
          )}
          {detail.event_count > pageSize ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 1 || query.isFetching}
                onClick={() => setPage(page - 1)}
              >
                前の履歴
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  page * pageSize >= detail.event_count || query.isFetching
                }
                onClick={() => setPage(page + 1)}
              >
                次の履歴
              </Button>
            </div>
          ) : null}
          {allowedDraft ? (
            <form
              key={allowedDraft}
              className="grid gap-2"
              onSubmit={(event) => submit(event, detail.thread, allowedDraft)}
            >
              <label htmlFor={bodyId} className="text-sm font-medium">
                {actionLabels[allowedDraft]}
              </label>
              <Textarea
                id={bodyId}
                name="body"
                required
                maxLength={4000}
                readOnly={action.isPending}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => {
                    action.reset();
                    setDraft(null);
                  }}
                >
                  キャンセル
                </Button>
                <Button type="submit" size="sm" disabled={action.isPending}>
                  保存
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.available_actions.map((name) => (
                <Button
                  type="button"
                  key={name}
                  size="sm"
                  variant="outline"
                  disabled={action.isPending}
                  onClick={() => {
                    action.reset();
                    if (requiresMessage.has(name)) setDraft(name);
                    else
                      action.mutate({
                        action: name,
                        version: detail.thread.version,
                      });
                  }}
                >
                  {actionLabels[name]}
                </Button>
              ))}
            </div>
          )}
          <FormApiError
            error={action.error}
            fallbackMessage="操作を保存できませんでした。"
          />
        </>
      )}
    </div>
  );
}
