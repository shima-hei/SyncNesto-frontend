"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";

import { UserDisplay } from "@/components/shared/display/user-avatar";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  GuestRequirementReviewCreate,
  PublicationNodeRead,
  PublicationRead,
} from "@/lib/api/generated/model";
import {
  DecisionShareFields,
  readDecisionShare,
} from "@/features/artifact-publications/components/decision-share-fields";
import { reviewTargetKind } from "@/features/requirements/lib/requirement-workflow-review";

import { createGuestReview, readReviewOptions } from "../lib/api";
import { PublishedReviewAttachments } from "./published-review-attachments";

export function GuestRequirementReviewRequest({
  projectId,
  publication,
  nodes,
  ready,
  allowNewSharing,
  initialRequirementCode,
}: {
  projectId: number;
  publication: PublicationRead;
  nodes: PublicationNodeRead[];
  ready: boolean;
  allowNewSharing: boolean;
  initialRequirementCode?: string;
}) {
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [shareWithGuest, setShareWithGuest] = useState(false);
  const [inputError, setInputError] = useState("");
  const publicationId = publication.content.id;
  const request = useRef<{ value: string; key: string } | null>(null);
  const targets = nodes.filter((node) =>
    ["requirement_document", "section", "requirement"].includes(node.node_kind),
  );
  const initialTarget = initialRequirementCode
    ? (targets.find(
        (node) =>
          node.node_kind === "requirement" &&
          node.payload.requirement_code === initialRequirementCode,
      )?.id ?? "")
    : targets[0]?.id;
  const options = useQuery({
    queryKey: ["guest-requirement-review-options", projectId, publicationId],
    queryFn: ({ signal }) =>
      readReviewOptions(
        projectId,
        { publication_id: publicationId },
        { signal },
      ),
    enabled: open,
    gcTime: 0,
    retry: false,
  });
  const create = useMutation({
    mutationFn: (data: GuestRequirementReviewCreate) =>
      createGuestReview(projectId, data),
    onSuccess: () => {
      request.current = null;
      dialog.current?.querySelector("form")?.reset();
      dialog.current?.close();
      toast.success("外部レビューを依頼しました");
      void client.invalidateQueries({
        queryKey: ["requirement-workflow", projectId],
      });
      void client.invalidateQueries({
        queryKey: ["publication-access", projectId, publicationId],
      });
      void client.invalidateQueries({
        queryKey: ["publication", projectId, publicationId],
      });
      void client.invalidateQueries({ queryKey: ["publications", projectId] });
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending || !options.data) return;
    const form = new FormData(event.currentTarget);
    const grantIds = form.getAll("reviewers").map(String);
    if (!grantIds.length && !shareWithGuest) {
      setInputError("レビュー担当者を選んでください。");
      return;
    }
    const sharing = shareWithGuest
      ? readDecisionShare(form, publication)
      : undefined;
    if (shareWithGuest && !sharing) {
      setInputError(
        "共有期限は現在より後で、選択した相手の参加期限以内に設定してください。",
      );
      return;
    }
    setInputError("");
    const values: Omit<GuestRequirementReviewCreate, "request_key"> = {
      publication_id: publicationId,
      target_node_id: String(form.get("target")),
      grant_ids: grantIds,
      expected_public_digest: options.data.public_digest,
      due_on: String(form.get("due") ?? "") || undefined,
      note: String(form.get("note") ?? "").trim() || undefined,
      sharing,
    };
    const value = JSON.stringify(values);
    if (request.current?.value !== value)
      request.current = { value, key: crypto.randomUUID() };
    create.mutate({ ...values, request_key: request.current.key });
  }
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={!ready || !targets.length}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <SendIcon data-icon="inline-start" />
        外部レビューを依頼
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-auto overscroll-contain rounded-lg border bg-background text-foreground backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/50"
        onClose={() => {
          setOpen(false);
          setShareWithGuest(false);
          setInputError("");
          create.reset();
        }}
      >
        <form className="grid min-w-0 gap-4 p-5" onSubmit={submit}>
          <div className="grid gap-1">
            <h1 id={titleId} className="text-lg font-semibold">
              外部レビューを依頼
            </h1>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              固定版から、担当者に確認してもらう範囲を選びます。
            </p>
          </div>
          {options.error ? (
            <DataLoadError
              resourceName="レビュー担当候補"
              onRetry={() => void options.refetch()}
            />
          ) : !options.data ? (
            <p role="status" className="text-sm text-muted-foreground">
              共有先を確認しています…
            </p>
          ) : (
            <fieldset className="grid gap-4" disabled={create.isPending}>
              <label className="grid gap-1 text-sm">
                レビュー対象
                <select
                  name="target"
                  required
                  defaultValue={initialTarget}
                  className="min-w-0 rounded-md border bg-background p-2"
                >
                  <option value="" disabled>
                    対象を選択
                  </option>
                  {targets.map((node) => (
                    <option key={node.id} value={node.id}>
                      {reviewTargetKind[node.node_kind]} ・{" "}
                      {String(node.payload.title ?? "")}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset
                className="grid gap-2 text-sm"
                onChange={() => setInputError("")}
              >
                <legend className="mb-1 font-medium">レビュー担当者</legend>
                {options.data.reviewers.length ? (
                  options.data.reviewers.map((person) => (
                    <label
                      key={person.grant_id}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        name="reviewers"
                        value={person.grant_id}
                      />
                      <UserDisplay name={person.name} emptyLabel="担当者" />
                    </label>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    有効な共有先がありません。
                  </p>
                )}
              </fieldset>
              {allowNewSharing && (
                <fieldset
                  className="grid gap-3 rounded-md border p-3 text-sm"
                  onChange={() => setInputError("")}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shareWithGuest}
                      onChange={(event) =>
                        setShareWithGuest(event.target.checked)
                      }
                    />
                    参加中のゲストにこの固定版も共有する
                  </label>
                  {open && shareWithGuest && (
                    <DecisionShareFields
                      projectId={projectId}
                      publication={publication}
                      existingParticipants={options.data.reviewers.map(
                        (person) => person.participation_id,
                      )}
                    />
                  )}
                </fieldset>
              )}
              <label className="grid gap-1 text-sm">
                回答期限（任意）
                <Input name="due" type="date" />
              </label>
              <label className="grid gap-1 text-sm">
                依頼メッセージ（任意）
                <Textarea name="note" maxLength={2000} />
              </label>
              <PublishedReviewAttachments nodes={nodes} />
            </fieldset>
          )}
          <FormApiError error={create.error} />
          {inputError && (
            <p className="text-sm text-destructive" role="alert">
              {inputError}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => dialog.current?.close()}
            >
              閉じる
            </Button>
            <Button
              type="submit"
              disabled={
                create.isPending ||
                !options.data ||
                (!options.data.reviewers.length && !shareWithGuest)
              }
            >
              {shareWithGuest ? "共有してレビューを依頼" : "レビューを依頼"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
