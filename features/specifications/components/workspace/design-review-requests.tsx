"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type {
  DesignReviewCreate,
  DesignReviewDecision,
  DesignReviewRead,
  SpecificationListItem,
} from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { listSpecifications } from "../../lib/api";
import {
  specificationCode,
  specificationHref,
  specificationKeys,
  statusLabels,
} from "../../lib/specification";
import {
  createDesignReviewRequest,
  decideDesignReviewRequest,
  designKey,
  listDesignReviewCandidates,
  listDesignReviewRequests,
} from "../../lib/workspace";

type Target = Pick<
  SpecificationListItem,
  "id" | "title" | "kind" | "version" | "status"
>;
const requestLabels = { review: "レビュー", approval: "承認" } as const;
const decisionLabels = {
  pending: "対応待ち",
  reviewed: "レビュー完了",
  approved: "承認済み",
  changes_requested: "修正依頼",
  cancelled: "取消済み",
} as const;
const fieldClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const requestKey = (projectId: number) => [
  ...designKey(projectId),
  "review-requests",
];

export function DesignReviewRequestDialog({
  projectId,
  defaults,
}: {
  projectId: number;
  defaults?: Target[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <ClipboardCheckIcon />
          レビュー・承認を依頼
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>レビュー・承認を依頼</DialogTitle>
          <DialogDescription>
            対象の版を固定し、1件の依頼として担当者に渡します。
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReviewRequestForm
            projectId={projectId}
            defaults={defaults}
            onSubmitted={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewRequestForm({
  projectId,
  defaults = [],
  onSubmitted,
}: {
  projectId: number;
  defaults?: Target[];
  onSubmitted: () => void;
}) {
  const cache = useQueryClient();
  const field = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<DesignReviewCreate["kind"]>(
    defaults.length && defaults.every((design) => design.status === "in_review")
      ? "approval"
      : "review",
  );
  const [targets, setTargets] = useState(
    () =>
      new Map(
        defaults
          .filter((design) => design.status !== "approved")
          .map((design) => [design.id, design]),
      ),
  );
  const canApprove =
    targets.size > 0 &&
    [...targets.values()].every((design) => design.status === "in_review");
  const effectiveKind =
    kind === "approval" && canApprove ? "approval" : "review";
  const candidates = useQuery({
    queryKey: [...requestKey(projectId), "candidates"],
    queryFn: ({ signal }) => listDesignReviewCandidates(projectId, { signal }),
    retry: false,
  });
  const available = useQuery({
    queryKey: [...requestKey(projectId), "targets", search],
    queryFn: ({ signal }) =>
      listSpecifications(projectId, { q: search, page_size: 50 }, { signal }),
  });
  const send = useMutation({
    mutationFn: () =>
      createDesignReviewRequest(projectId, {
        request_id: requestId,
        kind: effectiveKind,
        reviewer_id: Number(reviewer),
        note,
        targets: [...targets.values()].map(({ id, version }) => ({
          specification_id: id,
          version,
        })),
      }),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: designKey(projectId) }),
        cache.invalidateQueries({ queryKey: specificationKeys.all(projectId) }),
      ]);
      toast.success("固定版の依頼を作成しました。");
      onSubmitted();
    },
  });
  const toggle = (design: Target) => {
    setTargets((previous) => {
      const next = new Map(previous);
      if (next.has(design.id)) next.delete(design.id);
      else if (next.size < 30) next.set(design.id, design);
      return next;
    });
  };
  const visible = new Set(
    (available.data?.items ?? []).map((design) => design.id),
  );
  const offscreen = [...targets.values()].filter(
    (item) => !visible.has(item.id),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (targets.size && targets.size <= 30 && reviewer) send.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>依頼種別</span>
          <select
            className={fieldClass}
            value={effectiveKind}
            onChange={(event) =>
              setKind(event.target.value as DesignReviewCreate["kind"])
            }
          >
            <option value="review">レビュー</option>
            <option value="approval" disabled={!canApprove}>
              承認
            </option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>依頼先</span>
          <select
            className={fieldClass}
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            required
          >
            <option value="">
              {candidates.isPending ? "読み込み中…" : "メンバーを選択"}
            </option>
            {candidates.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {candidates.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          この案件に依頼できるメンバーがいません。
        </p>
      )}
      <FormApiError error={candidates.error} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">対象の設計書</legend>
        <Input
          aria-label="依頼対象を検索"
          placeholder="画面・API・DB設計を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {available.isPending && (
          <p role="status" className="text-sm">
            設計を読み込み中…
          </p>
        )}
        <FormApiError error={available.error} />
        <div className="max-h-56 divide-y overflow-auto rounded-md border">
          {[
            ...offscreen,
            ...(available.data?.items ?? []).filter(
              (design) =>
                design.status !== "approved" || targets.has(design.id),
            ),
          ].map((design) => (
            <label
              key={design.id}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={targets.has(design.id)}
                disabled={
                  send.isPending ||
                  (targets.size >= 30 && !targets.has(design.id))
                }
                onChange={() => toggle(design)}
              />
              <span className="min-w-0 flex-1 break-words">{design.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {specificationCode(design)} · 版 {design.version} ·{" "}
                {statusLabels[design.status]}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          {targets.size}{" "}
          件を選択（最大30件）。承認はレビュー中の設計を対象にします。
        </p>
      </fieldset>
      <div className="space-y-1">
        <label className="text-sm" htmlFor={field}>
          依頼メモ
        </label>
        <Textarea
          id={field}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
        />
      </div>
      <FormApiError error={send.error} />
      <Button
        type="submit"
        disabled={
          !reviewer || !targets.size || targets.size > 30 || send.isPending
        }
      >
        固定版を依頼
      </Button>
    </form>
  );
}

export function DesignReviewQueue({
  projectId,
  canEdit,
}: {
  projectId: number;
  canEdit: boolean;
}) {
  const [view, setView] = useState<"incoming" | "outgoing" | "history">(
    "incoming",
  );
  const history = view === "history";
  const queue = useQuery({
    queryKey: [...requestKey(projectId), history],
    queryFn: ({ signal }) =>
      listDesignReviewRequests(
        projectId,
        { pending_only: !history },
        { signal },
      ),
    retry: false,
  });
  const requests = queue.data?.filter((request) =>
    history
      ? request.status !== "pending"
      : view === "incoming"
        ? request.assigned_to_me
        : !request.assigned_to_me,
  );
  return (
    <section className="space-y-3" aria-label="自分の設計レビュー・承認">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <h2 className="text-base font-semibold">自分のレビュー・承認</h2>
        {canEdit && <DesignReviewRequestDialog projectId={projectId} />}
      </div>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["incoming", "要対応"],
            ["outgoing", "送った依頼"],
            ["history", "対応履歴"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={view === value ? "secondary" : "ghost"}
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {queue.isPending && (
        <p role="status" className="text-sm">
          依頼を読み込み中…
        </p>
      )}
      {queue.error && (
        <DataLoadError
          resourceName="設計のレビュー・承認依頼"
          isRetrying={queue.isFetching}
          onRetry={() => void queue.refetch()}
        />
      )}
      {requests?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          該当する依頼はありません。
        </p>
      )}
      {!!requests?.length && (
        <ul className="divide-y rounded-md border">
          {requests.map((request) => (
            <li key={request.id}>
              <ReviewRequestRow
                projectId={projectId}
                request={request}
                canEdit={canEdit}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewRequestRow({
  projectId,
  request,
  canEdit,
}: {
  projectId: number;
  request: DesignReviewRead;
  canEdit: boolean;
}) {
  const cache = useQueryClient();
  const [status, setStatus] = useState<DesignReviewDecision["status"]>(
    request.kind === "review" ? "reviewed" : "approved",
  );
  const [note, setNote] = useState("");
  const [cancel, setCancel] = useState(false);
  const decide = useMutation({
    mutationFn: (data: DesignReviewDecision) =>
      decideDesignReviewRequest(projectId, request.id, data),
    onSuccess: async () => {
      setCancel(false);
      await Promise.all([
        cache.invalidateQueries({ queryKey: designKey(projectId) }),
        cache.invalidateQueries({ queryKey: specificationKeys.all(projectId) }),
      ]);
    },
  });
  return (
    <details className="p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {requestLabels[request.kind]} · {request.targets.length}件 ·{" "}
        {decisionLabels[request.status]}
      </summary>
      <div className="mt-2 space-y-3 pl-4">
        <p className="text-xs text-muted-foreground">
          {request.requester_name} → {request.reviewer_name} ·{" "}
          {formatDateTime(request.created_at)}
        </p>
        <ul className="space-y-1 text-sm">
          {request.targets.map((target) => (
            <li key={target.specification_id}>
              <Link
                className="hover:underline"
                href={`${specificationHref(projectId, target.specification_id)}?tab=history&version=${target.version}`}
              >
                {target.title} · 固定版 {target.version}
              </Link>
            </li>
          ))}
        </ul>
        {request.note && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {request.note}
          </p>
        )}
        {request.decision_note && (
          <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-sm">
            {request.decision_note}
          </p>
        )}
        {canEdit && request.assigned_to_me && request.status === "pending" && (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              decide.mutate({ status, note });
            }}
          >
            <label className="block max-w-56 space-y-1 text-sm">
              <span>判断</span>
              <select
                className={fieldClass}
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as DesignReviewDecision["status"],
                  )
                }
              >
                {request.kind === "review" ? (
                  <option value="reviewed">レビュー完了</option>
                ) : (
                  <option value="approved">まとめて承認</option>
                )}
                <option value="changes_requested">修正依頼</option>
              </select>
            </label>
            <Textarea
              aria-label="判断のメモ"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              required={status === "changes_requested"}
            />
            <Button
              type="submit"
              size="sm"
              disabled={
                decide.isPending ||
                (status === "changes_requested" && !note.trim())
              }
            >
              判断を保存
            </Button>
          </form>
        )}
        {canEdit && request.can_cancel && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCancel(true)}
            >
              依頼を取り消す
            </Button>
            <ConfirmDialog
              open={cancel}
              onOpenChange={setCancel}
              title="この依頼を取り消しますか？"
              description="対象の固定版は履歴から確認できます。"
              confirmLabel="依頼を取り消す"
              isPending={decide.isPending}
              onConfirm={() => decide.mutate({ status: "cancelled" })}
            />
          </>
        )}
        <FormApiError error={decide.error} />
      </div>
    </details>
  );
}
