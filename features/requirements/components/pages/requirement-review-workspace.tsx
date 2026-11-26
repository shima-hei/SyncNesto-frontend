"use client";

import { UserDisplay } from "@/components/shared/display/user-avatar";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  MessageSquarePlusIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewItemStatus,
  reviewRequestStatus,
  reviewTargetKind,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import type {
  ArtifactNodeRead,
  RequirementReviewProgress,
  RequirementWorkflowRead,
} from "@/lib/api/generated/model";
import {
  confirmRemainingWorkflowReviewItemsProjectsProjectIdRequirementWorkflowRequestIdReviewConfirmRemainingPost as confirmRemaining,
  putWorkflowReviewItemProjectsProjectIdRequirementWorkflowRequestIdReviewItemsNodeIdPut as confirmItem,
  readRequirementWorkflowContentProjectsProjectIdRequirementWorkflowRequestIdContentGet as readContent,
  readRequirementWorkflowProjectsProjectIdRequirementWorkflowRequestIdGet as readRequest,
  readWorkflowReviewProgressProjectsProjectIdRequirementWorkflowRequestIdReviewProgressGet as readProgress,
  submitWorkflowReviewResultProjectsProjectIdRequirementWorkflowRequestIdReviewResultPost as submitReview,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { ReviewContent } from "../review/review-content";
import {
  ReviewDiscussion,
  type DiscussionDraft,
} from "../review/review-discussion";
import styles from "../review/review-progress.module.css";

type ReviewCommand = { version: number } & (
  | { action: "item"; nodeId: string; confirmed: boolean }
  | { action: "remaining" }
  | { action: "submit"; note: string }
);

const RequirementFormalApprovalWorkspace = dynamic(() =>
  import("./requirement-formal-approval-workspace").then(
    (module) => module.RequirementFormalApprovalWorkspace,
  ),
);

const participantStatus = {
  pending: "確認待ち",
  confirmed: "確認完了",
  changes_requested: "修正依頼を提出済み",
  approved: "承認済み",
  returned: "差し戻し",
};

export function RequirementReviewWorkspace({
  projectId,
  requestId,
  initialNodeId,
  initialThreadId,
}: {
  projectId: number;
  requestId: string;
  initialNodeId?: string;
  initialThreadId?: string;
}) {
  const client = useQueryClient();
  const reviewKey = ["requirement-workflow-review", projectId, requestId];
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNodeId ?? null,
  );
  const [showTargets, setShowTargets] = useState(true);
  const [showDiscussion, setShowDiscussion] = useState(true);
  const [draft, setDraft] = useState<DiscussionDraft | null>(null);
  const [highlight, setHighlight] = useState<{
    field: string;
    quote: string;
  } | null>(null);
  const [decision, setDecision] = useState<"remaining" | "submit" | null>(null);
  const mainContent = useRef<HTMLDivElement>(null);
  const discussion = useRef<HTMLElement>(null);
  const decisionTrigger = useRef<HTMLElement | null>(null);
  const noteId = useId();
  const request = useQuery({
    queryKey: [...reviewKey, "request"],
    queryFn: ({ signal }) => readRequest(projectId, requestId, { signal }),
    retry: false,
  });
  const content = useInfiniteQuery({
    queryKey: ["requirement-workflow-content", projectId, requestId],
    queryFn: ({ pageParam, signal }) =>
      readContent(
        projectId,
        requestId,
        { cursor: pageParam ?? undefined },
        { signal },
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled: request.data?.kind === "review",
    retry: false,
  });
  const nodes = content.data?.pages.flatMap((page) => page.items) ?? [];
  const lookupNodeId = selectedId === initialNodeId ? initialNodeId : undefined;
  const linkedContent = useQuery({
    queryKey: [
      "requirement-workflow-content",
      projectId,
      requestId,
      lookupNodeId,
    ],
    queryFn: ({ signal }) =>
      readContent(projectId, requestId, { node_id: lookupNodeId }, { signal }),
    enabled:
      request.data?.kind === "review" &&
      Boolean(lookupNodeId && !nodes.some((node) => node.id === lookupNodeId)),
    retry: false,
  });
  const linkedNode = linkedContent.data?.items[0];
  if (linkedNode && !nodes.some((node) => node.id === linkedNode.id)) {
    nodes.push(linkedNode);
  }
  const targets = nodes.filter((node) =>
    Boolean(reviewTargetKind[node.node_kind]),
  );
  const selected =
    targets.find(
      (node) => node.id === (selectedId ?? request.data?.target_node_id),
    ) ?? (lookupNodeId && linkedContent.isFetching ? undefined : targets[0]);
  const selectedIndex = targets.findIndex((node) => node.id === selected?.id);
  const requirementIds = targets
    .filter((node) => node.node_kind === "requirement")
    .map((node) => node.id);
  const pathIndex = requirementIds.indexOf(selected?.id ?? "");
  const windowStart = Math.max(0, pathIndex - 49);
  const nodeIds = requirementIds.slice(windowStart, windowStart + 100);
  const progress = useQuery({
    queryKey: [...reviewKey, "progress", nodeIds],
    queryFn: ({ signal }) =>
      readProgress(projectId, requestId, { node_ids: nodeIds }, { signal }),
    enabled: request.data?.kind === "review",
    retry: false,
  });

  function refresh() {
    return Promise.all([
      client.invalidateQueries({ queryKey: reviewKey }),
      client.invalidateQueries({ queryKey: ["home", "requirement-work"] }),
      client.invalidateQueries({
        queryKey: ["requirement-workflow", projectId],
      }),
    ]);
  }

  const mutation = useMutation({
    mutationFn: (
      command: ReviewCommand,
    ): Promise<RequirementReviewProgress | RequirementWorkflowRead> => {
      if (command.action === "item")
        return confirmItem(projectId, requestId, command.nodeId, {
          version: command.version,
          confirmed: command.confirmed,
        });
      if (command.action === "remaining")
        return confirmRemaining(projectId, requestId, {
          version: command.version,
        });
      return submitReview(projectId, requestId, {
        version: command.version,
        note: command.note || undefined,
      });
    },
    onSuccess: (_, command) => {
      if (command.action !== "item") setDecision(null);
      toast.success(
        command.action === "submit"
          ? "レビュー結果を提出しました"
          : "確認状況を保存しました",
      );
    },
    onSettled: refresh,
  });

  function selectTarget(node: ArtifactNodeRead, moveFocus = false) {
    if (node.id === selected?.id || mutation.isPending) return;
    setSelectedId(node.id);
    setDraft(null);
    setHighlight(null);
    mutation.reset();
    if (moveFocus) requestAnimationFrame(() => mainContent.current?.focus());
  }

  function openDiscussion(value: DiscussionDraft) {
    setShowDiscussion(true);
    setDraft(value);
    requestAnimationFrame(() =>
      discussion.current?.querySelector("textarea")?.focus(),
    );
  }

  function openDecision(action: "remaining" | "submit", trigger: HTMLElement) {
    decisionTrigger.current = trigger;
    mutation.reset();
    setDecision(action);
  }

  const workflow = request.data;
  const state = progress.data;
  if (request.error)
    return (
      <DataLoadError
        resourceName="レビュー依頼"
        onRetry={() => void request.refetch()}
      />
    );
  if (!workflow)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        レビュー依頼を読み込んでいます…
      </p>
    );
  if (workflow.kind === "formal_approval")
    return (
      <RequirementFormalApprovalWorkspace
        projectId={projectId}
        requestId={requestId}
      />
    );

  const reviewable =
    selected &&
    ["requirement_document", "section", "requirement"].includes(
      selected.node_kind,
    );
  const itemStates = new Map(
    state?.items?.map((item) => [item.node_id, item.status]),
  );
  const selectedState = selected ? itemStates.get(selected.id) : undefined;
  const remaining = state
    ? Math.max(
        0,
        state.requirement_count -
          state.confirmed_count -
          state.changes_requested_count,
      )
    : 0;
  const canDiscuss = Boolean(state?.can_discuss && reviewable);
  const canCorrect =
    canDiscuss && !workflow.external_review && workflow.status === "requested";
  const canRespond = Boolean(state?.can_respond);
  const busy = mutation.isPending || progress.isFetching;
  const people = new Map(
    workflow.participants.map((item) => [item.user_id, item.name]),
  );
  const targetsById = new Map(targets.map((node) => [node.id, node]));
  const actorName = (id: number) =>
    (id === workflow.requester_id ? workflow.requester_name : people.get(id)) ??
    "案件メンバー";

  function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || !state?.can_respond || busy) return;
    if (decision === "remaining")
      mutation.mutate({ action: decision, version: state.version });
    else {
      const note = String(
        new FormData(event.currentTarget).get("note") ?? "",
      ).trim();
      mutation.mutate({ action: decision, version: state.version, note });
    }
  }

  return (
    <div className="@container/review mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-5">
      <header className="grid min-w-0 gap-3 border-b pb-5">
        <Link
          className="flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          href={`/projects/joined/${projectId}/requirements/${workflow.document_id}?tab=approvals`}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          レビュー・合意に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] @2xl/review:text-3xl">
          {workflow.title}
        </h1>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Badge
            variant="secondary"
            className={
              workflow.status === "changes_requested"
                ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]"
                : undefined
            }
          >
            {reviewRequestStatus[workflow.status]}
          </Badge>
          <span className="flex items-center gap-1.5">
            <LockIcon className="size-4" aria-hidden="true" />
            対象版 {workflow.version_label}
          </span>
          {workflow.scope_kind !== "requirement_document" ? (
            <span className="[overflow-wrap:anywhere]">
              {reviewTargetKind[workflow.scope_kind]} ・ {workflow.target_title}
            </span>
          ) : null}
          {workflow.due_on ? (
            <span className="@2xl/review:ms-auto">
              回答期限{" "}
              <time dateTime={workflow.due_on}>
                {formatDate(workflow.due_on)}
              </time>
            </span>
          ) : null}
        </div>
        {workflow.note ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {workflow.note}
          </p>
        ) : null}
      </header>

      {progress.error ? (
        <DataLoadError
          resourceName="確認状況"
          onRetry={() => void progress.refetch()}
        />
      ) : state ? (
        <ReviewProgress workflow={workflow} progress={state} />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          確認状況を読み込んでいます…
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={showTargets}
          aria-controls="review-targets"
          onClick={() => setShowTargets(!showTargets)}
        >
          <ChevronDownIcon
            data-icon="inline-start"
            className={showTargets ? "rotate-180" : undefined}
          />
          確認対象
        </Button>
        {reviewable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showDiscussion}
            aria-controls="review-discussion"
            onClick={() => setShowDiscussion(!showDiscussion)}
          >
            <ChevronDownIcon
              data-icon="inline-start"
              className={showDiscussion ? "rotate-180" : undefined}
            />
            指摘・コメント
          </Button>
        ) : null}
      </div>
      {content.isError && !content.isFetchNextPageError ? (
        <DataLoadError
          resourceName="レビュー対象の本文"
          onRetry={() => void content.refetch()}
        />
      ) : content.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          対象版の本文を読み込んでいます…
        </p>
      ) : selected ? (
        <div
          className={cn(
            "grid min-w-0 items-start gap-y-4 border-y py-4 @3xl/review:gap-x-5 @6xl/review:gap-x-6",
            showTargets &&
              "@3xl/review:grid-cols-[minmax(9rem,0.65fr)_minmax(0,2fr)]",
            showTargets &&
              showDiscussion &&
              reviewable &&
              "@6xl/review:grid-cols-[minmax(10rem,0.75fr)_minmax(0,2fr)_minmax(15rem,1.1fr)]",
            !showTargets &&
              showDiscussion &&
              reviewable &&
              "@3xl/review:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]",
          )}
        >
          <nav
            id="review-targets"
            aria-label="確認対象"
            className={
              showTargets
                ? "grid min-w-0 gap-2 border-b pb-4 @3xl/review:border-e @3xl/review:border-b-0 @3xl/review:pe-4"
                : "hidden"
            }
          >
            <ol className="grid max-h-44 min-w-0 gap-1 overflow-y-auto overscroll-y-contain pe-1 @3xl/review:max-h-[36rem] [scrollbar-gutter:stable]">
              {targets.map((node) => {
                const active = node.id === selected.id;
                const itemStatus = itemStates.get(node.id);
                const parent = node.parent_id
                  ? targetsById.get(node.parent_id)
                  : undefined;
                return (
                  <li
                    key={node.id}
                    className={
                      parent?.node_kind === "section"
                        ? "ms-3 border-s ps-2"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => selectTarget(node)}
                      className={cn(
                        "grid w-full min-w-0 gap-1 rounded-md px-2 py-2 text-start text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                        active && "bg-muted font-medium text-foreground",
                      )}
                    >
                      <span className="[overflow-wrap:anywhere]">
                        {reviewTargetTitle(node)}
                      </span>
                      {itemStatus && state?.participant_status ? (
                        <span
                          className={cn(
                            "text-xs font-normal",
                            itemStatus === "confirmed"
                              ? "text-[var(--status-success-fg)]"
                              : itemStatus === "changes_requested"
                                ? "text-[var(--status-warning-fg)]"
                                : "text-muted-foreground",
                          )}
                        >
                          {reviewItemStatus[itemStatus]}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
            {content.hasNextPage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={content.isFetching}
                onClick={() => void content.fetchNextPage()}
              >
                {content.isFetchingNextPage
                  ? "読み込み中…"
                  : "対象の続きを表示"}
              </Button>
            ) : null}
          </nav>

          <div
            tabIndex={-1}
            ref={mainContent}
            className="grid min-w-0 gap-5 rounded-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ReviewContent
              key={selected.id}
              node={selected}
              nodes={nodes}
              projectId={projectId}
              complete={!content.hasNextPage}
              canDiscuss={canDiscuss}
              highlights={
                new Map(highlight ? [[highlight.field, [highlight.quote]]] : [])
              }
              onQuote={(anchor) => openDiscussion({ kind: "comment", anchor })}
            />
            {selected.node_kind === "test_design" && content.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                className="justify-self-start"
                disabled={content.isFetching}
                onClick={() => void content.fetchNextPage()}
              >
                添付資料の続きを読み込む
              </Button>
            ) : null}
            {canRespond || canCorrect ? (
              <div
                className="flex min-w-0 flex-wrap items-center gap-2"
                aria-label="この対象のレビュー操作"
              >
                {canRespond &&
                selectedState &&
                selectedState !== "changes_requested" ? (
                  <Button
                    type="button"
                    disabled={busy || !state}
                    variant={
                      selectedState === "confirmed" ? "outline" : "default"
                    }
                    onClick={() =>
                      state &&
                      mutation.mutate({
                        action: "item",
                        version: state.version,
                        nodeId: selected.id,
                        confirmed: selectedState !== "confirmed",
                      })
                    }
                  >
                    <CheckIcon data-icon="inline-start" />
                    {selectedState === "confirmed"
                      ? "確認を取り消す"
                      : "確認済みにする"}
                  </Button>
                ) : null}
                {selectedState === "changes_requested" ? (
                  <Badge
                    variant="outline"
                    className="border-[var(--status-warning-border)] text-[var(--status-warning-fg)]"
                  >
                    修正依頼あり
                  </Badge>
                ) : null}
                {canCorrect ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openDiscussion({ kind: "correction" })}
                  >
                    <MessageSquarePlusIcon data-icon="inline-start" />
                    修正を依頼
                  </Button>
                ) : null}
              </div>
            ) : null}
            {content.isFetchNextPageError ? (
              <DataLoadError
                resourceName="対象の続き"
                onRetry={() => void content.fetchNextPage()}
              />
            ) : null}
          </div>

          {reviewable ? (
            <aside
              id="review-discussion"
              ref={discussion}
              aria-label="指摘・コメント"
              className={
                showDiscussion
                  ? cn(
                      "grid min-w-0 gap-3 border-t pt-4 @6xl/review:border-s @6xl/review:border-t-0 @6xl/review:ps-4 @6xl/review:pt-0",
                      showTargets
                        ? "@3xl/review:col-start-2 @6xl/review:col-start-auto"
                        : "@3xl/review:border-s @3xl/review:border-t-0 @3xl/review:ps-4 @3xl/review:pt-0",
                    )
                  : "hidden"
              }
            >
              <h2 className="font-semibold">指摘・コメント</h2>
              {workflow.external_review ? (
                <p className="text-sm text-muted-foreground">
                  外部参加者の指摘への返信と修正回答は、その指摘を登録した本人に表示されます。
                </p>
              ) : null}
              <ReviewDiscussion
                key={selected.id}
                projectId={projectId}
                requestId={requestId}
                queryKey={reviewKey}
                actorName={actorName}
                refresh={refresh}
                node={selected}
                initialThreadId={
                  selected.id === initialNodeId ? initialThreadId : undefined
                }
                version={state?.version ?? workflow.version}
                canDiscuss={canDiscuss}
                canCorrect={canCorrect}
                draft={draft}
                onDraft={setDraft}
                onHighlight={(field, quote) => {
                  setHighlight({ field, quote });
                  document
                    .getElementById(`review-field-${field}`)
                    ?.scrollIntoView({ block: "nearest" });
                }}
              />
            </aside>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          表示できる対象はありません。
        </p>
      )}

      <footer className="grid gap-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={selectedIndex <= 0}
              onClick={() => selectTarget(targets[selectedIndex - 1], true)}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              前の対象
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={selectedIndex + 1 >= targets.length}
              onClick={() => selectTarget(targets[selectedIndex + 1], true)}
            >
              次の対象
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
          {canRespond ? (
            <div className="flex flex-wrap gap-2">
              {remaining ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={(event) =>
                    openDecision("remaining", event.currentTarget)
                  }
                >
                  残りをまとめて確認
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={busy || remaining > 0}
                onClick={(event) => openDecision("submit", event.currentTarget)}
              >
                <SendIcon data-icon="inline-start" />
                レビュー結果を提出
              </Button>
            </div>
          ) : state?.participant_status &&
            state.participant_status !== "pending" ? (
            <Badge variant="outline">
              {participantStatus[state.participant_status]}
            </Badge>
          ) : null}
        </div>
        {canRespond && remaining > 0 ? (
          <p className="text-sm text-muted-foreground">
            未確認の要件が{remaining}件あります。
          </p>
        ) : null}
        {!decision ? (
          <FormApiError
            error={mutation.error}
            fallbackMessage="確認状況を保存できませんでした。"
          />
        ) : null}
      </footer>

      <Dialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setDecision(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (decisionTrigger.current?.isConnected)
              decisionTrigger.current.focus();
            else mainContent.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {decision === "remaining"
                ? "残りをまとめて確認"
                : "レビュー結果を提出"}
            </DialogTitle>
            <DialogDescription>
              {decision === "remaining"
                ? `未確認の要件${remaining}件を確認済みにします。修正依頼中の要件は対象から外れます。`
                : state?.open_correction_count
                  ? `未解決の修正依頼${state.open_correction_count}件を含むレビュー結果を提出します。`
                  : "この対象版のレビュー結果を提出します。"}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitDecision}>
            {decision === "submit" ? (
              <div className="grid gap-2">
                <label htmlFor={noteId}>提出メッセージ（任意）</label>
                <Textarea
                  id={noteId}
                  name="note"
                  maxLength={2000}
                  readOnly={mutation.isPending}
                />
              </div>
            ) : null}
            <FormApiError
              error={mutation.error}
              fallbackMessage="操作を保存できませんでした。"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setDecision(null)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  !canRespond ||
                  (decision === "remaining" ? remaining === 0 : remaining > 0)
                }
              >
                {decision === "remaining" ? "まとめて確認する" : "提出する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewProgress({
  workflow,
  progress,
}: {
  workflow: RequirementWorkflowRead;
  progress: RequirementReviewProgress;
}) {
  const id = useId();
  const own = progress.participant_status !== null;
  const total = own ? progress.requirement_count : workflow.participants.length;
  const done = own
    ? progress.confirmed_count
    : workflow.participants.filter((person) => person.status !== "pending")
        .length;

  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-2 rounded-lg bg-muted/60 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold">
          {own ? "要件の確認状況" : "担当者の提出状況"}
        </h2>
        <span className="text-sm font-medium tabular-nums" role="status">
          {done} / {total}
          {own ? "件" : "人"}
        </span>
      </div>
      {total > 0 ? (
        <progress
          aria-labelledby={id}
          value={done}
          max={total}
          className={styles.progress}
        />
      ) : null}
      {progress.open_correction_count ? (
        <p className="text-sm text-[var(--status-warning-fg)]">
          未解決の修正依頼 {progress.open_correction_count}件
        </p>
      ) : null}
      {!own && workflow.participants.length ? (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer text-muted-foreground">
            担当者別の状況
          </summary>
          <ul className="mt-2 grid gap-1">
            {workflow.participants.map((person) => (
              <li
                key={person.user_id}
                className="flex flex-wrap justify-between gap-2"
              >
                <UserDisplay name={person.name} emptyLabel="担当者" />
                <span className="text-muted-foreground">
                  {participantStatus[person.status]}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
