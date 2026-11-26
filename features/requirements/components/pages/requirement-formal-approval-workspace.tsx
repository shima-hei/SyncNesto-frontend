"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRequirementVersion } from "../../lib/requirement-version-content";
import {
  ArrowLeftIcon,
  CheckIcon,
  FileCheckIcon,
  GitCompareIcon,
  LockIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SnapshotContent } from "@/features/artifact-releases/components/snapshot-content";
import { reviewTargetTitle } from "@/features/requirements/lib/requirement-workflow-review";
import type {
  ArtifactNodeRead,
  RequirementFormalApprovalDecisionInput,
} from "@/lib/api/generated/model";
import {
  decideRequirementFormalApprovalProjectsProjectIdRequirementWorkflowRequestIdFormalApprovalDecisionPost as decideApproval,
  previewRequirementFormalApprovalDecisionProjectsProjectIdRequirementWorkflowRequestIdFormalApprovalDecisionGet as previewDecision,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { formatDate, formatDateTime } from "@/lib/format/date";
import styles from "../forms/requirement-formal-approval-dialog.module.css";
import {
  RequirementVersionChanges,
  type RequirementVersionChange,
} from "../review/requirement-version-changes";

export function RequirementFormalApprovalWorkspace({
  projectId,
  requestId,
}: {
  projectId: number;
  requestId: string;
}) {
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [decision, setDecision] = useState<
    RequirementFormalApprovalDecisionInput["decision"] | null
  >(null);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [viewedTarget, setViewedTarget] = useState(false);
  const queryKey = [
    "requirement-formal-approval-decision",
    projectId,
    requestId,
  ];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => previewDecision(projectId, requestId, { signal }),
    retry: false,
  });
  const operation = useRef<RequirementFormalApprovalDecisionInput | null>(null);
  const mutation = useMutation({
    mutationFn: (data: RequirementFormalApprovalDecisionInput) =>
      decideApproval(projectId, requestId, data),
    onSuccess: (result, input) => {
      client.setQueryData(queryKey, {
        ...query.data,
        request: result,
        can_decide: false,
      });
      dialog.current?.close();
      toast.success(
        input.decision === "approved" ? "承認を記録しました" : "差し戻しました",
      );
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ["home", "requirement-work"] }),
        client.invalidateQueries({
          queryKey: ["requirement-workflow", projectId],
        }),
        client.invalidateQueries({
          queryKey: ["requirement-formal-approval-baseline", projectId],
        }),
      ]),
  });
  if (query.error)
    return (
      <DataLoadError
        resourceName="正式承認"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        正式承認を読み込んでいます…
      </p>
    );

  const {
    request,
    previous_baseline: previous,
    release_digest: releaseDigest,
    can_decide: canDecide,
  } = query.data;
  const stateText =
    request.status === "requested"
      ? "承認待ち"
      : request.status === "approved"
        ? "正式承認済み"
        : request.status === "returned"
          ? "差し戻し"
          : "取消済み";
  const approvedCount = request.participants.filter(
    (person) => person.status === "approved",
  ).length;
  const exceptions = request.approval_basis?.exceptions ?? [];

  function openDecision(
    kind: RequirementFormalApprovalDecisionInput["decision"],
  ) {
    operation.current = null;
    mutation.reset();
    setDecision(kind);
    dialog.current?.showModal();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || !canDecide || mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    if ((decision === "returned" && !reason) || form.get("confirmed") !== "on")
      return;
    if (
      !operation.current ||
      operation.current.reason !== (reason || undefined) ||
      operation.current.version !== request.version
    ) {
      operation.current = {
        operation_key: crypto.randomUUID(),
        version: request.version,
        expected_release_digest: releaseDigest,
        decision,
        confirmed_content: true,
        reason: reason || undefined,
      };
    }
    mutation.mutate(operation.current);
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-5 pb-6">
      <Link
        href={`/projects/joined/${projectId}/requirements/${request.document_id}?tab=approvals`}
        className="flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        レビュー・合意に戻る
      </Link>
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold">要件定義書の正式承認</h1>
        <Badge variant="outline">{stateText}</Badge>
      </header>
      <section className="grid min-w-0 gap-3 border-b pb-4">
        <h2 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
          {request.title}
        </h2>
        <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <LockIcon className="size-4" aria-hidden="true" />
            承認対象版 {request.version_label}
          </p>
          {request.due_on ? (
            <p>
              回答期限{" "}
              <time dateTime={request.due_on}>
                {formatDate(request.due_on)}
              </time>
            </p>
          ) : null}
        </div>
        {request.note ? (
          <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
            {request.note}
          </p>
        ) : null}
        <details
          className="min-w-0"
          onToggle={(event) => setBodyOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer rounded-sm py-2 font-medium focus-visible:outline-2 focus-visible:outline-ring">
            <FileCheckIcon className="me-2 inline size-4" aria-hidden="true" />
            要件定義書全文を確認
          </summary>
          {bodyOpen ? (
            <div className="mt-2 border-t pt-4">
              <SnapshotContent
                projectId={projectId}
                releaseId={request.release_id}
                onReady={setViewedTarget}
              />
            </div>
          ) : null}
        </details>
        {previous ? (
          <details
            className="min-w-0"
            onToggle={(event) => setComparisonOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer rounded-sm py-2 font-medium focus-visible:outline-2 focus-visible:outline-ring">
              <GitCompareIcon
                className="me-2 inline size-4"
                aria-hidden="true"
              />
              前回承認済み版との比較
            </summary>
            {comparisonOpen ? (
              <RequirementVersionComparison
                projectId={projectId}
                beforeId={previous.id}
                afterId={requestId}
              />
            ) : null}
          </details>
        ) : (
          <p className="text-sm text-muted-foreground">
            参照できる前回の承認済み版はありません。
          </p>
        )}
      </section>
      {exceptions.length ? (
        <section className="grid gap-2 border-b pb-4">
          <h2 className="font-semibold">承認の例外</h2>
          <ul className="divide-y rounded-md border px-3 text-sm">
            {exceptions.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="grid min-w-0 gap-1 py-2"
              >
                <p className="font-medium [overflow-wrap:anywhere]">
                  {item.reason}
                </p>
                <p className="text-muted-foreground">
                  {item.kind === "correction" ? "修正依頼" : "未決事項"} ・
                  担当者 {item.owner_id} ・ 対応期限 {formatDate(item.due_on)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="grid gap-2 border-b pb-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">承認者</h2>
          <span className="tabular-nums text-muted-foreground">
            {approvedCount} / {request.participants.length}人
          </span>
        </div>
        <ul className="divide-y">
          {request.participants.map((person) => (
            <li
              key={person.user_id}
              className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 py-2"
            >
              <span className="[overflow-wrap:anywhere]">
                {person.name ?? "承認者"}
              </span>
              <span className="text-muted-foreground">
                {person.status === "approved"
                  ? "承認済み"
                  : person.status === "returned"
                    ? "差し戻し"
                    : "承認待ち"}
                {person.responded_at
                  ? ` ・ ${formatDateTime(person.responded_at)}`
                  : ""}
              </span>
              {person.response_note ? (
                <p className="w-full whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
                  {person.response_note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      {canDecide ? (
        <footer className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            {viewedTarget
              ? "この版の要件定義書を、プロジェクトの開発基準として正式に承認します。"
              : "承認・差し戻しの前に、対象版の全文を表示してください。"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={!viewedTarget || query.isFetching || mutation.isPending}
              onClick={() => openDecision("returned")}
            >
              <Undo2Icon data-icon="inline-start" />
              差し戻す
            </Button>
            <Button
              type="button"
              disabled={!viewedTarget || query.isFetching || mutation.isPending}
              onClick={() => openDecision("approved")}
            >
              <CheckIcon data-icon="inline-start" />
              承認する
            </Button>
          </div>
        </footer>
      ) : null}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.dialog}
        onClose={() => setDecision(null)}
        onCancel={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        {decision ? (
          <form className="grid gap-4 p-5" onSubmit={submit}>
            <h1 id={titleId} className="text-xl font-semibold">
              {decision === "approved" ? "正式に承認する" : "差し戻す"}
            </h1>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {request.title} ・ 承認対象版 {request.version_label}
            </p>
            {decision === "returned" ? (
              <label className="grid gap-2 text-sm">
                差し戻し理由
                <Textarea
                  name="reason"
                  required
                  maxLength={2000}
                  readOnly={mutation.isPending}
                />
              </label>
            ) : null}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="confirmed"
                required
                className="mt-1"
              />
              承認対象の内容を確認しました
            </label>
            <FormApiError error={mutation.error} />
            <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => dialog.current?.close()}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || query.isFetching || !canDecide}
              >
                {decision === "approved" ? "承認を記録" : "差し戻しを記録"}
              </Button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}

function describeFields(payload: ArtifactNodeRead["payload"]) {
  return Object.entries(payload).filter(
    ([key]) => !["status", "source", "sort_order"].includes(key),
  );
}

export function RequirementVersionComparison({
  projectId,
  beforeId,
  afterId,
}: {
  projectId: number;
  beforeId: string;
  afterId: string;
}) {
  const comparison = useQuery({
    queryKey: [
      "requirement-formal-approval-comparison",
      projectId,
      beforeId,
      afterId,
    ],
    queryFn: ({ signal }) =>
      Promise.all([
        fetchRequirementVersion(projectId, beforeId, signal),
        fetchRequirementVersion(projectId, afterId, signal),
      ]),
    retry: false,
  });
  if (comparison.error)
    return (
      <DataLoadError
        resourceName="承認済み版との差分"
        onRetry={() => void comparison.refetch()}
      />
    );
  if (comparison.isPending)
    return (
      <p role="status" className="py-2 text-sm text-muted-foreground">
        版の内容を比較しています…
      </p>
    );

  const [before, after] = comparison.data;
  const key = (node: ArtifactNodeRead) => `${node.node_kind}:${node.source_id}`;
  const beforeByKey = new Map(before.map((node) => [key(node), node]));
  const afterByKey = new Map(after.map((node) => [key(node), node]));
  const beforeParents = new Map(before.map((node) => [node.id, node]));
  const afterParents = new Map(after.map((node) => [node.id, node]));
  const changes = [
    ...new Set([...beforeByKey.keys(), ...afterByKey.keys()]),
  ].flatMap<RequirementVersionChange>((id) => {
    const older = beforeByKey.get(id);
    const newer = afterByKey.get(id);
    const label = newer
      ? reviewTargetTitle(newer)
      : older
        ? reviewTargetTitle(older)
        : "承認対象";
    const previous = new Map(older ? describeFields(older.payload) : []);
    const current = new Map(newer ? describeFields(newer.payload) : []);
    if (older && newer) {
      const oldParent = older.parent_id
        ? beforeParents.get(older.parent_id)
        : null;
      const newParent = newer.parent_id
        ? afterParents.get(newer.parent_id)
        : null;
      if (
        (oldParent ? key(oldParent) : null) !==
        (newParent ? key(newParent) : null)
      ) {
        previous.set(
          "parent",
          oldParent ? reviewTargetTitle(oldParent) : "直下",
        );
        current.set(
          "parent",
          newParent ? reviewTargetTitle(newParent) : "直下",
        );
      }
      previous.set("position", older.position + 1);
      current.set("position", newer.position + 1);
    }
    const fields = [
      ...new Set([...previous.keys(), ...current.keys()]),
    ].flatMap((field) => {
      const before = previous.get(field);
      const after = current.get(field);
      return JSON.stringify(before) === JSON.stringify(after)
        ? []
        : [{ field, before, after }];
    });
    if (older && newer && !fields.length) return [];
    return [
      { id, label, type: !older ? "追加" : !newer ? "削除" : "変更", fields },
    ];
  });
  return <RequirementVersionChanges changes={changes} />;
}
