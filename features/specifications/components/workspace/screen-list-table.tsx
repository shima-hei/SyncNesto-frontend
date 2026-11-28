"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import { createDraftScope } from "@/lib/draft/draft-key";
import { formatDateTime } from "@/lib/format/date";
import type {
  CollectionRead,
  DesignScreenListProjectsProjectIdDesignWorkspaceScreenListGetParams,
  ScreenListBatch,
  ScreenListEdit,
  ScreenListMember,
  ScreenListRow,
} from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import {
  copyScreenList,
  readScreenListPaste,
} from "../../lib/screen-list-clipboard";
import {
  specificationCode,
  specificationHref,
  specificationKeys,
  statusLabels,
} from "../../lib/specification";
import {
  designKey,
  readScreenList,
  readScreenListMembers,
  saveScreenListEdits,
  screenKinds,
} from "../../lib/workspace";
import { DesignReviewRequestDialog } from "./design-review-requests";

type Filters =
  DesignScreenListProjectsProjectIdDesignWorkspaceScreenListGetParams;
const columnLabels = {
  id: "画面ID",
  title: "画面名",
  screen_kind: "画面種別",
  route: "URL・識別子",
  groups: "機能グループ",
  related_requirements: "関連要件",
  related_apis: "関連API",
  assignee: "担当者",
  status: "レビュー・承認状態",
  updated_at: "更新日時",
} as const;
type Column = keyof typeof columnLabels;
type Sort = NonNullable<Filters["sort"]>;
const columns = Object.keys(columnLabels) as Column[];
const sortable = new Set<Column>([
  "id",
  "title",
  "screen_kind",
  "route",
  "assignee",
  "status",
  "updated_at",
]);
const cellInput =
  "h-8 min-w-0 border-transparent bg-transparent px-1 shadow-none focus-visible:border-ring";
const filterInput = "h-8 rounded-md border bg-background px-2 text-sm";
const emptyBatch: ScreenListBatch = { request_id: "", edits: [] };
const estimatedRowHeight = 43;
const screenColumnWidth: Record<Column, number> = {
  id: 91,
  title: 180,
  screen_kind: 130,
  route: 165,
  groups: 160,
  related_requirements: 112,
  related_apis: 112,
  assignee: 130,
  status: 143,
  updated_at: 147,
};

function virtualRows(
  rows: ScreenListRow[],
  heights: ReadonlyMap<number, number>,
  top: number,
  extent: number,
  pinned: ReadonlySet<number>,
) {
  const result: (
    { row: ScreenListRow; index: number } | { spacer: number; index: number }
  )[] = [];
  let position = 0;
  let spacer = 0;
  for (const [index, row] of rows.entries()) {
    const height = heights.get(row.id) ?? estimatedRowHeight;
    if (
      pinned.has(row.id) ||
      (position + height >= top - 210 && position <= top + extent + 210)
    ) {
      if (spacer) result.push({ spacer, index });
      result.push({ row, index });
      spacer = 0;
    } else spacer += height;
    position += height;
  }
  if (spacer) result.push({ spacer, index: rows.length });
  return result;
}

function mergeEdits(previous: ScreenListEdit[], incoming: ScreenListEdit[]) {
  const byId = new Map(
    previous.flatMap((edit, index) => (edit.id ? [[edit.id, index]] : [])),
  );
  const next = [...previous];
  for (const edit of incoming) {
    const index = edit.id ? byId.get(edit.id) : undefined;
    if (index === undefined) next.push(edit);
    else
      next[index] = { ...next[index], ...edit, version: next[index].version };
  }
  return next;
}

export function ScreenListTable({
  projectId,
  canEdit,
  canCreate,
  groups,
  groupId,
  search,
  page,
  onPage,
}: {
  projectId: number;
  canEdit: boolean;
  canCreate: boolean;
  groups: CollectionRead[];
  groupId: string;
  search: string;
  page: number;
  onPage: (page: number) => void;
}) {
  const cache = useQueryClient();
  const { user } = useAuth();
  const [sort, setSort] = useState<Sort>("id");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [grouped, setGrouped] = useState(false);
  const [screenKind, setScreenKind] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [hidden, setHidden] = useState<Column[]>([]);
  const [selected, setSelected] = useState(new Set<number>());
  const [quickName, setQuickName] = useState("");
  const [batch, setBatch] = useState<ScreenListBatch>(emptyBatch);
  const [paste, setPaste] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ top: 0, height: 540 });
  const [heights, setHeights] = useState(new Map<number, number>());
  const [focusedRow, setFocusedRow] = useState<number>();
  const [expandedGroups, setExpandedGroups] = useState(new Set<number>());
  const drafts = useFormDraft({
    userId: canEdit ? user?.id : undefined,
    scope: createDraftScope(
      "design-workspace",
      "screen-list",
      "update",
      projectId,
    ),
    values: batch,
    initialValues: emptyBatch,
    onRestore: setBatch,
  });
  const filters: Filters = {
    q: search,
    group_id: groupId || undefined,
    page,
    page_size: 50,
    sort,
    direction,
    status: (status || undefined) as Filters["status"],
    screen_kind: (screenKind || undefined) as Filters["screen_kind"],
    assignee_id: assignee ? Number(assignee) : undefined,
  };
  const listing = useQuery({
    queryKey: [...designKey(projectId), "screen-list", filters],
    queryFn: ({ signal }) => readScreenList(projectId, filters, { signal }),
    retry: false,
  });
  const members = useQuery({
    queryKey: [...designKey(projectId), "screen-list-members"],
    queryFn: ({ signal }) => readScreenListMembers(projectId, { signal }),
    enabled: canEdit,
  });
  const save = useMutation({
    mutationFn: () => saveScreenListEdits(projectId, batch),
    onSuccess: async (result) => {
      drafts.clearDraft();
      setBatch(emptyBatch);
      setNotice(`${result.length}行を保存しました。`);
      await Promise.all([
        cache.invalidateQueries({ queryKey: designKey(projectId) }),
        cache.invalidateQueries({ queryKey: specificationKeys.all(projectId) }),
      ]);
    },
  });
  const stage = (edits: ScreenListEdit[]) => {
    const next = mergeEdits(batch.edits, edits);
    if (next.length > 100) {
      setNotice(
        "保存前の変更は100行までです。いまの変更を保存してから追加してください。",
      );
      return false;
    }
    save.reset();
    setNotice("");
    setBatch({ request_id: crypto.randomUUID(), edits: next });
    return true;
  };
  const rows = listing.data?.items ?? [];
  const virtual = !grouped && rows.length > 25;
  const pinned = new Set(expandedGroups);
  if (focusedRow !== undefined) pinned.add(focusedRow);
  const windowRows = virtual
    ? virtualRows(rows, heights, range.top, range.height, pinned)
    : [];
  const measuredRows = windowRows
    .flatMap((item) => ("row" in item ? [item.row.id] : []))
    .join(",");
  useEffect(() => {
    if (!virtual || !viewport.current) return;
    const element = viewport.current;
    const observer = new ResizeObserver((entries) => {
      const changes = entries.flatMap((entry) => {
        const id = (entry.target as HTMLElement).dataset.screenRow;
        return id
          ? [
              [
                Number(id),
                Math.ceil(entry.target.getBoundingClientRect().height),
              ] as const,
            ]
          : [];
      });
      if (changes.length)
        setHeights((previous) => {
          const measured = changes.filter(
            ([id, height]) => previous.get(id) !== height,
          );
          return measured.length
            ? new Map([...previous, ...measured])
            : previous;
        });
      if (entries.some((entry) => entry.target === element)) {
        const top = Math.floor(element.scrollTop / 16) * 16;
        const height = element.clientHeight;
        setRange((previous) =>
          previous.top === top && previous.height === height
            ? previous
            : { top, height },
        );
      }
    });
    observer.observe(element);
    element
      .querySelectorAll("[data-screen-row]")
      .forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [virtual, measuredRows]);
  const memberOptions = members.data ?? [];
  const visible = columns.filter((column) => !hidden.includes(column));
  const updates = new Map(
    batch.edits.flatMap((edit) => (edit.id ? [[edit.id, edit]] : [])),
  );
  const checked = rows.filter((row) => selected.has(row.id));
  const scope = `/projects/joined/${projectId}`;
  const change = (row: ScreenListRow, value: ScreenListEdit) =>
    stage([{ id: row.id, version: row.version, ...value }]);
  const copy = () =>
    copyScreenList(
      checked,
      (row) => statusLabels[row.status],
      (row) => formatDateTime(row.updated_at),
    );
  const displayGroups = (row: ScreenListRow) =>
    updates.get(row.id)?.group_ids ?? row.groups.map((group) => group.id);
  const addQuick = () => {
    if (!quickName.trim() || save.isPending) return;
    if (
      stage([
        { title: quickName.trim(), group_ids: groupId ? [groupId] : undefined },
      ])
    )
      setQuickName("");
  };
  const cell = (row: ScreenListRow, column: Column) => {
    const draft = updates.get(row.id);
    const label =
      columnLabels[column] +
      " " +
      specificationCode({ id: row.id, kind: "screen" });
    switch (column) {
      case "id":
        return (
          <Link
            className="font-mono text-xs text-primary hover:underline"
            href={specificationHref(projectId, row.id)}
          >
            {specificationCode({ id: row.id, kind: "screen" })}
          </Link>
        );
      case "title":
        return canEdit ? (
          <Input
            className={cellInput}
            aria-label={label}
            value={draft?.title ?? row.title}
            disabled={save.isPending}
            maxLength={200}
            onChange={(event) => change(row, { title: event.target.value })}
          />
        ) : (
          row.title
        );
      case "route":
        return canEdit ? (
          <Input
            className={cn(cellInput, "font-mono")}
            aria-label={label}
            value={draft?.route ?? row.route}
            disabled={save.isPending}
            maxLength={1000}
            onChange={(event) => change(row, { route: event.target.value })}
          />
        ) : (
          <span className="font-mono text-xs">{row.route || "未設定"}</span>
        );
      case "screen_kind":
        return canEdit ? (
          <select
            className={cn(filterInput, "w-full border-transparent")}
            aria-label={label}
            value={draft?.screen_kind ?? row.screen_kind}
            disabled={save.isPending}
            onChange={(event) =>
              change(row, {
                screen_kind: event.target
                  .value as ScreenListEdit["screen_kind"],
              })
            }
          >
            {Object.entries(screenKinds).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          screenKinds[row.screen_kind]
        );
      case "assignee": {
        const value =
          draft && "assignee_id" in draft
            ? draft.assignee_id
            : row.assignee?.id;
        return canEdit ? (
          <select
            className={cn(filterInput, "w-full border-transparent")}
            aria-label={label}
            value={value ?? ""}
            disabled={save.isPending || members.isPending}
            onChange={(event) =>
              change(row, {
                assignee_id: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            <option value="">担当なし</option>
            {row.assignee &&
              !memberOptions.some(
                (member) => member.id === row.assignee?.id,
              ) && <option value={row.assignee.id}>{row.assignee.name}</option>}
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        ) : (
          row.assignee?.name || "担当なし"
        );
      }
      case "groups": {
        const assigned = displayGroups(row);
        const text =
          groups
            .filter((group) => assigned.includes(group.id))
            .map((group) => group.name)
            .join("、") || "未所属";
        return canEdit && groups.length ? (
          <details
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setExpandedGroups((previous) => {
                if (previous.has(row.id) === open) return previous;
                const next = new Set(previous);
                if (open) next.add(row.id);
                else next.delete(row.id);
                return next;
              });
            }}
          >
            <summary className="cursor-pointer" aria-label={label}>
              {text}
            </summary>
            <div className="min-w-36 space-y-1 py-1">
              {groups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={assigned.includes(group.id)}
                    disabled={save.isPending}
                    onChange={(event) =>
                      change(row, {
                        group_ids: event.target.checked
                          ? [...assigned, group.id]
                          : assigned.filter((id) => id !== group.id),
                      })
                    }
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </details>
        ) : (
          row.groups.map((group) => group.name).join("、") || "未所属"
        );
      }
      case "related_requirements":
      case "related_apis":
        return (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            {row[column].map((item) => (
              <Link
                key={item.id}
                className="text-primary hover:underline"
                title={item.title}
                href={
                  column === "related_apis"
                    ? specificationHref(projectId, item.id)
                    : `${scope}/requirements/${item.container_id}/items/${item.id}`
                }
              >
                {item.code}
              </Link>
            ))}
            {!row[column].length && (
              <span className="text-muted-foreground">―</span>
            )}
          </div>
        );
      case "status":
        return statusLabels[row.status];
      case "updated_at":
        return (
          <time
            className="whitespace-nowrap text-xs text-muted-foreground"
            dateTime={row.updated_at}
          >
            {formatDateTime(row.updated_at)}
          </time>
        );
    }
  };
  const buckets = new Map<string, ScreenListRow[]>();
  for (const row of rows) {
    const name = grouped ? (row.groups[0]?.name ?? "未所属") : "";
    const bucket = buckets.get(name) ?? [];
    bucket.push(row);
    buckets.set(name, bucket);
  }
  return (
    <section className="min-w-0 space-y-3 p-3" aria-label="画面一覧の編集">
      <DraftRestoreDialog
        open={!!drafts.pendingDraft}
        onRestore={drafts.restoreDraft}
        onDiscard={drafts.discardDraft}
      />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          画面種別
          <select
            className={filterInput}
            value={screenKind}
            onChange={(event) => {
              setScreenKind(event.target.value);
              onPage(1);
            }}
          >
            <option value="">すべて</option>
            {Object.entries(screenKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          状態
          <select
            className={filterInput}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              onPage(1);
            }}
          >
            <option value="">すべて</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          担当者
          <select
            className={filterInput}
            value={assignee}
            onChange={(event) => {
              setAssignee(event.target.value);
              onPage(1);
            }}
          >
            <option value="">すべて</option>
            <option value="0">担当なし</option>
            {(canEdit
              ? memberOptions
              : Array.from(
                  new Map(
                    rows.flatMap((row) =>
                      row.assignee ? [[row.assignee.id, row.assignee]] : [],
                    ),
                  ).values(),
                )
            ).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          type="button"
          variant={grouped ? "secondary" : "outline"}
          aria-pressed={grouped}
          onClick={() => setGrouped((value) => !value)}
        >
          機能グループでまとめる
        </Button>
        <details className="relative text-sm">
          <summary className="cursor-pointer rounded-md px-2 py-1.5">
            列の表示
          </summary>
          <div className="absolute right-0 z-30 w-max space-y-1 rounded-md border bg-popover p-2 shadow-sm">
            {columns.map((column) => (
              <label key={column} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!hidden.includes(column)}
                  disabled={visible.length === 1 && visible[0] === column}
                  onChange={(event) =>
                    setHidden((previous) =>
                      event.target.checked
                        ? previous.filter((key) => key !== column)
                        : [...previous, column],
                    )
                  }
                />
                {columnLabels[column]}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!checked.length}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copy());
              setNotice(`${checked.length}行をコピーしました。`);
            } catch {
              setNotice(
                "クリップボードにコピーできませんでした。行を選択してコピーのキー操作を試してください。",
              );
            }
          }}
        >
          選択行をコピー
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setPaste("")}>
            複数行を貼り付け
          </Button>
        )}
        {canEdit && checked.length > 0 && (
          <DesignReviewRequestDialog
            projectId={projectId}
            defaults={checked.map((row) => ({ ...row, kind: "screen" }))}
          />
        )}
        {!!batch.edits.length && (
          <>
            <Button
              size="sm"
              disabled={
                save.isPending ||
                batch.edits.length > 100 ||
                batch.edits.some(
                  (edit) => edit.title !== undefined && !edit.title?.trim(),
                )
              }
              onClick={() => save.mutate()}
            >
              {batch.edits.length}行を保存
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={save.isPending}
              onClick={() => {
                drafts.clearDraft();
                setBatch(emptyBatch);
                save.reset();
              }}
            >
              変更を取り消す
            </Button>
          </>
        )}
      </div>
      <FormApiError error={save.error ?? members.error} />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {batch.edits.some((edit) => !edit.id) && (
        <div
          className="rounded-md border bg-muted/40 p-2 text-sm"
          aria-label="追加予定の画面"
        >
          <span className="font-medium">追加予定</span>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {batch.edits.flatMap((edit, index) =>
              edit.id ? [] : [<li key={index}>{edit.title}</li>],
            )}
          </ul>
        </div>
      )}
      {listing.error ? (
        <DataLoadError
          resourceName="画面一覧"
          isRetrying={listing.isFetching}
          onRetry={() => void listing.refetch()}
        />
      ) : (
        <div
          ref={viewport}
          className="max-h-[62dvh] overflow-auto rounded-md border"
          role="region"
          aria-label="画面一覧の表"
          tabIndex={0}
          onScroll={(event) => {
            const top = Math.floor(event.currentTarget.scrollTop / 16) * 16;
            setRange((previous) =>
              previous.top === top ? previous : { ...previous, top },
            );
          }}
          onCopy={(event) => {
            const target = event.target;
            if (
              target instanceof HTMLInputElement &&
              target.selectionStart !== target.selectionEnd
            )
              return;
            if (checked.length) {
              event.preventDefault();
              event.clipboardData.setData("text/plain", copy());
              setNotice(`${checked.length}行をコピーしました。`);
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text/plain");
            if (canEdit && /[\t\r\n]/.test(text)) {
              event.preventDefault();
              setPaste(text);
            }
          }}
        >
          <table
            className={cn(
              "w-full min-w-6xl border-separate border-spacing-0 text-left text-sm",
              virtual && "table-fixed",
            )}
            aria-rowcount={
              virtual
                ? rows.length + 1 + (canCreate && canEdit ? 1 : 0)
                : undefined
            }
            style={
              virtual
                ? {
                    minWidth:
                      40 +
                      visible.reduce(
                        (width, name) => width + screenColumnWidth[name],
                        0,
                      ),
                  }
                : undefined
            }
          >
            <caption className="sr-only">
              画面設計一覧。列見出しのボタンで並べ替えできます。
            </caption>
            {virtual && (
              <colgroup>
                <col style={{ width: 40 }} />
                {visible.map((column) => (
                  <col
                    key={column}
                    style={{ width: screenColumnWidth[column] }}
                  />
                ))}
              </colgroup>
            )}
            <thead className="sticky top-0 z-10 bg-muted text-xs">
              <tr>
                <th scope="col" className="w-10 border-b p-2">
                  <input
                    type="checkbox"
                    aria-label="表示中の行を選択"
                    checked={rows.length > 0 && checked.length === rows.length}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? new Set(rows.map((row) => row.id))
                          : new Set(),
                      )
                    }
                  />
                </th>
                {visible.map((column) => (
                  <th
                    scope="col"
                    key={column}
                    className="border-b px-2 py-1 font-medium"
                    aria-sort={
                      sort === column
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable.has(column) ? (
                      <Button
                        variant="ghost"
                        type="button"
                        size="sm"
                        className="h-7 w-full justify-start px-0 text-xs"
                        onClick={() => {
                          setDirection(
                            sort === column && direction === "asc"
                              ? "desc"
                              : "asc",
                          );
                          setSort(column as Sort);
                          onPage(1);
                        }}
                      >
                        {columnLabels[column]}
                        {sort === column &&
                          (direction === "asc" ? (
                            <ArrowUpIcon aria-hidden />
                          ) : (
                            <ArrowDownIcon aria-hidden />
                          ))}
                      </Button>
                    ) : (
                      columnLabels[column]
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            {[...buckets.entries()].map(([name, entries]) => (
              <tbody key={name}>
                {grouped && (
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={visible.length + 1}
                      className="border-b bg-muted/55 px-2 py-1 text-xs"
                    >
                      {name} · {entries.length}件
                    </th>
                  </tr>
                )}
                {(virtual
                  ? windowRows
                  : entries.map((row, index) => ({ row, index }))
                ).map((item) => {
                  if ("spacer" in item)
                    return (
                      <tr key={`space-${item.index}`} aria-hidden="true">
                        <td
                          colSpan={visible.length + 1}
                          style={{ height: item.spacer }}
                        />
                      </tr>
                    );
                  const { row, index } = item;
                  return (
                    <tr
                      key={row.id}
                      data-screen-row={row.id}
                      aria-rowindex={virtual ? index + 2 : undefined}
                      onFocusCapture={() => {
                        if (virtual) setFocusedRow(row.id);
                      }}
                      onBlurCapture={(event) => {
                        if (
                          virtual &&
                          !event.currentTarget.contains(event.relatedTarget)
                        )
                          setFocusedRow((previous) =>
                            previous === row.id ? undefined : previous,
                          );
                      }}
                      className={cn(updates.has(row.id) && "bg-primary/5")}
                    >
                      <td className="border-b p-2">
                        <input
                          type="checkbox"
                          aria-label={row.title + "を選択"}
                          checked={selected.has(row.id)}
                          onChange={(event) =>
                            setSelected((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      {visible.map((column) => (
                        <td
                          key={column}
                          className={cn(
                            "border-b border-l px-2 py-1 align-top",
                            [
                              "title",
                              "route",
                              "groups",
                              "assignee",
                              "screen_kind",
                            ].includes(column) && "min-w-32",
                          )}
                        >
                          {cell(row, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            ))}
            {(!rows.length || (canCreate && canEdit)) && (
              <tbody>
                {!rows.length && (
                  <tr>
                    <td
                      className="px-3 py-5 text-sm text-muted-foreground"
                      colSpan={visible.length + 1}
                    >
                      {listing.isPending
                        ? "画面を読み込み中…"
                        : "条件に一致する画面はありません。"}
                    </td>
                  </tr>
                )}
                {canCreate && canEdit && (
                  <tr aria-rowindex={virtual ? rows.length + 2 : undefined}>
                    <td
                      colSpan={visible.length + 1}
                      className="bg-muted/25 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          className="max-w-64"
                          value={quickName}
                          maxLength={200}
                          aria-label="新しい画面名"
                          placeholder="新しい画面名"
                          onChange={(event) => setQuickName(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.nativeEvent.isComposing &&
                              event.keyCode !== 229
                            ) {
                              event.preventDefault();
                              addQuick();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!quickName.trim() || save.isPending}
                          onClick={addQuick}
                        >
                          <PlusIcon />
                          行に追加
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      )}
      {listing.data && listing.data.total > 50 && (
        <DataPagination
          page={page}
          total={listing.data.total}
          pageSize={50}
          currentCount={rows.length}
          onPageChange={onPage}
        />
      )}
      <Dialog
        open={paste !== null}
        onOpenChange={(open) => {
          if (!open) setPaste(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>画面一覧に複数行を貼り付け</DialogTitle>
            <DialogDescription>
              表を貼り付けて、追加または更新する行を確認します。
            </DialogDescription>
          </DialogHeader>
          {paste !== null && (
            <ScreenPasteForm
              text={paste}
              setText={setPaste}
              canCreate={canCreate}
              groups={groups}
              members={memberOptions}
              visibleRows={rows}
              selected={checked}
              defaultGroup={groupId}
              onStage={(edits) => {
                if (!stage(edits)) return false;
                setPaste(null);
                return true;
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ScreenPasteForm({
  text,
  setText,
  canCreate,
  groups,
  members,
  visibleRows,
  selected,
  defaultGroup,
  onStage,
}: {
  text: string;
  setText: (text: string) => void;
  canCreate: boolean;
  groups: CollectionRead[];
  members: ScreenListMember[];
  visibleRows: ScreenListRow[];
  selected: ScreenListRow[];
  defaultGroup?: string;
  onStage: (edits: ScreenListEdit[]) => boolean;
}) {
  const [mode, setMode] = useState<"create" | "update">(
    canCreate && !selected.length ? "create" : "update",
  );
  const [limitReached, setLimitReached] = useState(false);
  const { edits, errors } = readScreenListPaste(text, {
    mode,
    groups,
    members,
    visibleRows,
    selection: selected,
    defaultGroup,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (edits.length && !errors.length) setLimitReached(!onStage(edits));
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        貼り付け方法
        <select
          className={filterInput}
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as typeof mode);
            setLimitReached(false);
          }}
        >
          {canCreate && <option value="create">新規画面を追加</option>}
          <option value="update">一覧の既存行を更新</option>
        </select>
      </label>
      <Textarea
        aria-label="貼り付ける表"
        placeholder={"画面名\t画面種別\tURL・識別子\t機能グループ\t担当者"}
        rows={6}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setLimitReached(false);
        }}
      />
      {limitReached && (
        <p className="text-sm text-destructive" role="alert">
          未保存の変更が100行を超えています。
        </p>
      )}
      {!!errors.length && (
        <ul
          className="max-h-32 overflow-auto rounded-md border p-2 text-sm text-destructive"
          role="alert"
        >
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {!!edits.length && (
        <p className="text-sm" role="status">
          {edits.length}行を{mode === "create" ? "追加" : "更新"}します。
        </p>
      )}
      <Button type="submit" disabled={!edits.length || !!errors.length}>
        編集内容に取り込む
      </Button>
    </form>
  );
}
