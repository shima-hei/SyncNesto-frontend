"use client";

import { useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

import { StatusIndicator } from "@/components/shared/display/status-badge";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import type {
  VerificationDetail,
  VerificationRow,
} from "@/lib/api/generated/model";

import { readPreparation, startPlan } from "../lib/api";

export function VerificationPreparation({
  projectId,
  requirementId,
  version,
  onStart,
}: {
  projectId: number;
  requirementId: number;
  version: number;
  onStart: (plan: VerificationDetail) => void;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const prefix = useId();
  const [targetKind, setTargetKind] = useState<"approved" | "current">();
  const [drafts, setDrafts] = useState<Record<string, VerificationRow[]>>({});
  const [firstRowId] = useState(() => crypto.randomUUID());
  const lastRequest = useRef<{ key: string; id: string }>(null);
  const preparation = useQuery({
    queryKey: [
      "verification-preparation",
      tenant?.id,
      user?.id,
      projectId,
      requirementId,
      version,
    ],
    queryFn: ({ signal }) =>
      readPreparation(projectId, requirementId, { signal }),
    retry: false,
  });
  const start = useMutation({
    mutationFn: (payload: Parameters<typeof startPlan>[1]) =>
      startPlan(projectId, payload),
    onSuccess: onStart,
  });
  if (preparation.isPending)
    return <Skeleton className="h-24" aria-label="検証対象を取得中" />;
  if (preparation.isError)
    return (
      <DataLoadError
        resourceName="検証対象"
        onRetry={() => void preparation.refetch()}
      />
    );
  const targets = preparation.data.targets;
  const target =
    targets.find((option) => option.kind === targetKind) ?? targets[0];
  if (!target)
    return (
      <p className="text-sm text-muted-foreground">検証対象がありません。</p>
    );
  const current = targets.find((option) => option.kind === "current");
  const changedSinceApproval =
    targets.length > 1 && current?.subject_digest !== targets[0].subject_digest;
  const acceptance = target.acceptance_criteria;
  const initial =
    acceptance.trim() && acceptance.length <= 4000
      ? [
          {
            id: firstRowId,
            description: acceptance,
            reference: {
              field: "acceptance_criteria" as const,
              start: 0,
              text: acceptance,
            },
          },
        ]
      : [];
  const rows = drafts[target.subject_digest] ?? initial;
  const setRows = (next: VerificationRow[]) =>
    setDrafts((previous) => ({ ...previous, [target.subject_digest]: next }));
  const canStart =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.description?.trim() &&
        ((row.method === "manual" && row.manual_plan?.trim()) ||
          (row.method === "test" && row.targets?.length) ||
          (row.method === "not_applicable" &&
            row.not_applicable_reason?.trim())),
    );
  const conflict =
    start.error instanceof ApiError && start.error.code === "VERSION_CONFLICT";
  const updateRow = (index: number, row: VerificationRow) =>
    setRows(
      rows.map((existing, position) => (position === index ? row : existing)),
    );

  return (
    <form
      className="grid min-w-0 gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canStart || start.isPending || conflict) return;
        const payload = {
          source_requirement_id: requirementId,
          approval_id: target.approval_id,
          expected_subject_digest: target.subject_digest,
          checklist: { rows },
        };
        const key = JSON.stringify(payload);
        if (lastRequest.current?.key !== key)
          lastRequest.current = { key, id: crypto.randomUUID() };
        start.mutate({ ...payload, request_id: lastRequest.current.id });
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold">受け入れ条件と検証方法</h3>
        <StatusIndicator tone="neutral">準備中</StatusIndicator>
      </div>
      <FieldSet disabled={start.isPending} className="grid min-w-0 gap-3">
        {target.kind === "current" ? (
          <p className="text-xs text-muted-foreground">
            現在の保存内容で検証します。正式承認の結果とは別に記録されます。
          </p>
        ) : changedSinceApproval ? (
          <p className="text-xs text-muted-foreground">
            承認済み版と現在の保存内容に差分があります。
          </p>
        ) : null}
        {acceptance.trim() ? (
          <blockquote className="min-w-0 whitespace-pre-wrap border-s-2 ps-3 text-sm [overflow-wrap:anywhere]">
            {acceptance}
          </blockquote>
        ) : (
          <p className="text-sm text-muted-foreground">
            この版に受け入れ条件はありません。確認したい内容を追加できます。
          </p>
        )}
        {rows.map((row, index) => (
          <FieldSet key={row.id} className="min-w-0 border-t pt-3">
            <FieldLegend>確認項目 {index + 1}</FieldLegend>
            <FieldGroup className="gap-3">
              {row.description && row.description !== acceptance ? (
                <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                  {row.description}
                </p>
              ) : null}
              <details
                open={!row.description || undefined}
                className="min-w-0 text-sm"
              >
                <summary className="cursor-pointer text-muted-foreground">
                  確認内容を編集
                </summary>
                <Field className="mt-2">
                  <FieldLabel htmlFor={row.id + "-description"}>
                    何を確かめるか
                  </FieldLabel>
                  <Textarea
                    id={row.id + "-description"}
                    rows={2}
                    maxLength={4000}
                    value={row.description ?? ""}
                    onChange={(event) =>
                      updateRow(index, {
                        ...row,
                        description: event.target.value,
                      })
                    }
                  />
                </Field>
              </details>
              <div className="grid max-w-xl gap-1.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    関連テスト{" "}
                    <span className="text-muted-foreground">
                      {row.method === "test" && row.targets?.length
                        ? `${row.targets.length}件`
                        : "未設定"}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={row.method === "test"}
                    disabled={!preparation.data.test_items.length}
                    onClick={() => updateRow(index, { ...row, method: "test" })}
                  >
                    関連付け
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    手動確認{" "}
                    <span className="text-muted-foreground">
                      {row.method === "manual" && row.manual_plan?.trim()
                        ? "設定済み"
                        : "未設定"}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={row.method === "manual"}
                    onClick={() =>
                      updateRow(index, {
                        ...row,
                        method: "manual",
                        targets: [],
                      })
                    }
                  >
                    手動確認を設定
                  </Button>
                </div>
              </div>
              {row.method === "test" ? (
                <fieldset className="grid gap-1">
                  <legend className="text-sm font-medium">関連テスト</legend>
                  {preparation.data.test_items.map((item) => (
                    <label
                      key={item.item_id}
                      className="flex min-w-0 items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={
                          row.targets?.some(
                            (chosen) => chosen.item_id === item.item_id,
                          ) ?? false
                        }
                        onChange={(event) =>
                          updateRow(index, {
                            ...row,
                            targets: event.currentTarget.checked
                              ? [
                                  ...(row.targets ?? []),
                                  {
                                    item_id: item.item_id,
                                    pattern_scope: "all_enabled",
                                  },
                                ]
                              : row.targets?.filter(
                                  (chosen) => chosen.item_id !== item.item_id,
                                ),
                          })
                        }
                      />
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {item.code} {item.title}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : row.method === "manual" || row.method === "not_applicable" ? (
                <Field>
                  <FieldLabel htmlFor={row.id + "-procedure"}>
                    {row.method === "manual"
                      ? "手動確認方法"
                      : "対象外とする理由"}
                  </FieldLabel>
                  <Textarea
                    id={row.id + "-procedure"}
                    rows={2}
                    maxLength={4000}
                    value={
                      (row.method === "manual"
                        ? row.manual_plan
                        : row.not_applicable_reason) ?? ""
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        row.method === "manual"
                          ? { ...row, manual_plan: event.target.value }
                          : {
                              ...row,
                              not_applicable_reason: event.target.value,
                            },
                      )
                    }
                  />
                </Field>
              ) : null}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  確認項目の操作
                </summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateRow(index, {
                        ...row,
                        method: "not_applicable",
                        targets: [],
                      })
                    }
                  >
                    検証対象外にする
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setRows(rows.filter((_, position) => position !== index))
                    }
                  >
                    項目を取り除く
                  </Button>
                </div>
              </details>
            </FieldGroup>
          </FieldSet>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={rows.length >= 100}
          onClick={() => setRows([...rows, { id: crypto.randomUUID() }])}
        >
          <PlusIcon data-icon="inline-start" />
          確認項目を追加
        </Button>
        <div className="border-t pt-3">
          <Field className="max-w-72">
            <FieldLabel htmlFor={prefix + "-target"}>検証対象</FieldLabel>
            <select
              id={prefix + "-target"}
              value={target.kind}
              onChange={(event) => {
                setTargetKind(
                  event.currentTarget.value === "approved"
                    ? "approved"
                    : "current",
                );
                start.reset();
              }}
              className="w-fit max-w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {targets.map((choice) => (
                <option key={choice.kind} value={choice.kind}>
                  {choice.label}
                  {choice.kind === "current"
                    ? `（要件版 ${choice.version}）`
                    : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FieldSet>
      <FormApiError error={start.error} />
      {conflict ? (
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={preparation.isFetching}
          onClick={() =>
            void preparation.refetch().then((result) => {
              if (result.isSuccess) start.reset();
            })
          }
        >
          対象内容を読み直す
        </Button>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          開始時点の対象と確認項目を記録します。
        </p>
        <Button
          type="submit"
          disabled={!canStart || start.isPending || conflict}
        >
          {start.isPending ? "開始中…" : "検証を開始"}
        </Button>
      </div>
    </form>
  );
}
