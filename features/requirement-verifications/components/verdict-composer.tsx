"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format/date";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type {
  VerdictEvidence,
  VerdictPreview,
  VerdictSummary,
} from "@/lib/api/generated/model";
import { listEvidenceSets, getEvidence } from "../lib/evidence-api";
import { evidenceResults } from "../lib/evidence";
import { listJudges, previewRequest, createRequest } from "../lib/verdict-api";
import { label, verdictHref, verdictLabels } from "../lib/verdict";
import { VerdictReadiness } from "./verdict-readiness";

function SelectEntries({
  projectId,
  planId,
  setId,
  scope,
  selected,
  onChange,
  disabled,
}: {
  projectId: number;
  planId: string;
  setId: string;
  scope: (string | number | undefined)[];
  selected: VerdictEvidence[];
  onChange: (entries: VerdictEvidence[]) => void;
  disabled: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey: [...scope, "entries", setId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getEvidence(projectId, planId, setId, { cursor: pageParam }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
  if (query.isPending)
    return <Skeleton className="h-16" aria-label="選べる根拠を読込中" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="選べる根拠"
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <FieldGroup>
      {query.data.pages
        .flatMap((p) => p.entries)
        .map((entry) => {
          const id = label(entry.id),
            checked = selected.some(
              (e) => e.set_id === setId && e.entry_id === id,
            );
          return (
            <Field key={id} orientation="horizontal">
              <Checkbox
                disabled={disabled}
                id={`verdict-entry-${setId}-${id}`}
                checked={checked}
                onCheckedChange={(v) =>
                  onChange(
                    v === true
                      ? [...selected, { set_id: setId, entry_id: id }]
                      : selected.filter(
                          (e) => e.set_id !== setId || e.entry_id !== id,
                        ),
                  )
                }
              />
              <FieldLabel
                htmlFor={`verdict-entry-${setId}-${id}`}
                className="min-w-0 break-words"
              >
                {label(entry.row_description)} ·{" "}
                {evidenceResults[label(entry.result)] ?? label(entry.result)}
                {entry.use === "historical_record" ? "（参考記録）" : ""}
              </FieldLabel>
            </Field>
          );
        })}
      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          根拠をさらに表示
        </Button>
      ) : null}
    </FieldGroup>
  );
}

export function VerdictComposer({
  projectId,
  planId,
  version,
  scope,
  previous,
  from,
  rowId,
  onClose,
}: {
  projectId: number;
  planId: string;
  version: number;
  scope: (string | number | undefined)[];
  previous?: VerdictSummary;
  from: string;
  rowId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [judge, setJudge] = useState("");
  const [entries, setEntries] = useState<VerdictEvidence[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<VerdictPreview | null>(null);
  const operation = useRef<{ input: string; id: string } | null>(null);
  const judges = useQuery({
    queryKey: [...scope, "judges"],
    queryFn: () => listJudges(projectId),
    retry: false,
  });
  const sets = useInfiniteQuery({
    queryKey: [...scope, "ready-evidence", version],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listEvidenceSets(projectId, planId, {
        plan_version: version,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
  const input = {
    plan_id: planId,
    plan_version: version,
    judge_id: Number(judge),
    entries,
    previous_request_id: previous?.id,
    reviewed_decision_id: previous?.result
      ? previous.id
      : previous?.reviewed_decision_id,
    reason,
  };
  const preflight = useMutation({
    mutationFn: () => previewRequest(projectId, input),
    onSuccess: setPreview,
  });
  const save = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error("固定する内容を確認してください");
      const body = {
          ...input,
          expected_preview_digest: preview.preview_digest,
        },
        serialized = JSON.stringify(body);
      if (!operation.current || operation.current.input !== serialized)
        operation.current = { input: serialized, id: crypto.randomUUID() };
      return createRequest(projectId, {
        ...body,
        operation_id: operation.current.id,
      });
    },
    onSuccess: (row) => {
      router.push(verdictHref(projectId, row.id, from, rowId));
      onClose();
    },
  });
  const busy = preflight.isPending || save.isPending;
  const reset = () => {
    setPreview(null);
    preflight.reset();
    save.reset();
  };
  const available =
    sets.data?.pages
      .flatMap((p) => p.items ?? [])
      .filter((s) => s.status === "ready") ?? [];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {previous ? "見直しを依頼" : "最終判断を依頼"}
          </DialogTitle>
          <DialogDescription>
            確認表 {version}版 · 使う根拠と判定担当を選びます。
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="flex flex-col gap-4">
            <p>判定担当：{preview.judge_name}</p>
            <VerdictReadiness value={preview.readiness} />
            <p className="text-sm text-muted-foreground">
              選択した根拠 {preview.entries.length}件 · 保全ファイル{" "}
              {preview.file_count}件
            </p>
            {preview.comparison.requirement !== "same" ? (
              <Alert>
                <AlertDescription>
                  元の要件と固定対象に違いがあるか、照合できません。依頼はこの固定内容に残ります。
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <FieldGroup>
            {judges.isError ? (
              <DataLoadError
                resourceName="判定担当"
                onRetry={() => void judges.refetch()}
              />
            ) : (
              <Field>
                <FieldLabel htmlFor="verdict-judge">判定担当</FieldLabel>
                <Select
                  value={judge}
                  disabled={busy}
                  onValueChange={(v) => {
                    setJudge(v);
                    reset();
                  }}
                >
                  <SelectTrigger id="verdict-judge">
                    <SelectValue placeholder="担当を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {judges.data?.items.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                          {u.is_self ? "（あなたが判定）" : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="verdict-request-reason">
                {previous ? "見直す理由（必須）" : "依頼メモ（任意）"}
              </FieldLabel>
              <Textarea
                disabled={busy}
                id="verdict-request-reason"
                value={reason}
                maxLength={4000}
                onChange={(e) => {
                  setReason(e.target.value);
                  reset();
                }}
              />
            </Field>
            {previous ? (
              <p className="text-sm">
                直前の依頼：{verdictLabels[previous.status]} ·{" "}
                {verdictLabels[previous.result ?? ""] ?? "未確定"}
                {previous.reviewed_decision_id && !previous.result
                  ? "（取消前の確定判断も引き継ぎます）"
                  : ""}
              </p>
            ) : null}
            {sets.isError ? (
              <DataLoadError
                resourceName="保全済み根拠"
                onRetry={() => void sets.refetch()}
              />
            ) : sets.isPending ? (
              <Skeleton className="h-20" aria-label="保全済み根拠を読込中" />
            ) : available.length ? (
              available.map((set) => (
                <details
                  key={set.id}
                  onToggle={(e) => {
                    const open = e.currentTarget.open;
                    setExpanded((items) =>
                      open
                        ? [...new Set([...items, set.id])]
                        : items.filter((id) => id !== set.id),
                    );
                  }}
                >
                  <summary className="cursor-pointer py-2">
                    {set.actor_name} · {formatDateTime(set.created_at)} · 根拠{" "}
                    {set.entry_count}件 · 添付 {set.file_count}件
                  </summary>
                  {expanded.includes(set.id) ? (
                    <SelectEntries
                      disabled={busy}
                      projectId={projectId}
                      planId={planId}
                      setId={set.id}
                      scope={scope}
                      selected={entries}
                      onChange={(v) => {
                        setEntries(v);
                        reset();
                      }}
                    />
                  ) : null}
                </details>
              ))
            ) : (
              <Alert>
                <AlertDescription>
                  この版の保全済み根拠はまだありません。証拠を提出・保全してから選択できます。
                </AlertDescription>
              </Alert>
            )}
            {sets.hasNextPage ? (
              <Button
                variant="outline"
                disabled={sets.isFetchingNextPage}
                onClick={() => void sets.fetchNextPage()}
              >
                提出をさらに表示
              </Button>
            ) : null}
          </FieldGroup>
        )}
        <FormApiError error={save.error ?? preflight.error} />
        <DialogFooter>
          {preview ? (
            <>
              <Button variant="outline" disabled={busy} onClick={reset}>
                選び直す
              </Button>
              <Button disabled={busy} onClick={() => save.mutate()}>
                この内容で判定を依頼
              </Button>
            </>
          ) : (
            <Button
              disabled={busy || !judge || Boolean(previous && !reason.trim())}
              onClick={() => preflight.mutate()}
            >
              固定する内容を確認
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
