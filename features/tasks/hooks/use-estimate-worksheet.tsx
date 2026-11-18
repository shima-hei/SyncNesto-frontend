"use client";
import {
  useState,
  useRef,
  useEffect,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EstimateWorksheetRow, TaskRead } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/error";
import {
  getGetTaskEstimateTasksTaskIdEstimateGetQueryKey,
  updateEstimateWorksheetProjectsProjectIdEstimateWorksheetPatch,
} from "@/lib/api/generated/task-estimates/task-estimates";
import {
  bounds,
  fromTsv,
  toTsv,
  type CellAddress,
} from "../lib/estimate-worksheet-range";
import { invalidateTaskProjectSurfaces } from "../lib/task-cache";

import {
  draftError,
  fieldError,
  sheetFields,
  sheetLabels,
  startingValues,
  worksheetChange,
  type SheetDraft,
  type SheetField,
  type SheetMethod,
} from "../lib/estimate-worksheet";

export function useEstimateWorksheet(
  grid: React.RefObject<HTMLTableElement | null>,
  projectId: number,
  requestedMethod: SheetMethod,
  tasks: TaskRead[],
  rows: EstimateWorksheetRow[],
  writable: boolean,
  detailId: number | null,
) {
  const client = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, SheetDraft>>({});
  const [selection, select] = useState<{
    anchor: CellAddress;
    end: CellAddress;
  } | null>(null);
  const [editor, setEditor] = useState<{
    cell: CellAddress;
    initial: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [feedback, setFeedback] = useState("");
  const method = Object.values(drafts)[0]?.values.method ?? requestedMethod;
  const internalFocus = useRef(false);
  const fields: readonly SheetField[] = sheetFields[method];
  const ids = tasks.map((t) => t.id);
  const byId = new Map(rows.map((r) => [r.task_id, r]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const entries = Object.values(drafts);
  const count = entries.length;
  const range =
    selection && bounds(ids, fields, selection.anchor, selection.end);
  const rangeSize = range
    ? (range.bottom - range.top + 1) * (range.right - range.left + 1)
    : 0;
  useEffect(() => {
    if (!count) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [count]);
  function draftFor(id: number): SheetDraft | undefined {
    if (drafts[id]) return drafts[id];
    const base = byId.get(id),
      task = taskById.get(id);
    if (
      !base ||
      !task ||
      task.estimated_basis !== "own" ||
      (base.current.method && base.current.method !== method)
    )
      return;
    return { base, values: startingValues(base, method), title: task.title };
  }
  function update(changes: { cell: CellAddress; value: string }[]) {
    if (!writable || lock.current) return;
    if (
      changes.some(({ cell }) => cell.id === detailId) &&
      document.querySelector(
        'aside [data-effort-dirty="true"], aside [data-effort-pending="true"]',
      )
    ) {
      toast.error("先に詳細の編集を保存または取り消してください。");
      return;
    }
    const next = { ...drafts };
    for (const {
      cell: { id, field },
      value,
    } of changes) {
      const draft = next[id] ?? draftFor(id);
      if (!draft || draft.values.method !== method)
        throw new Error(
          "選択範囲に別の方式または入力対象外のタスクがあります。",
        );
      const values = { ...draft.values, [field]: value };
      const original = startingValues(draft.base, method);
      if (
        (!draft.base.current.method || draft.base.current.method === method) &&
        fields.every((f) => values[f] === original[f])
      )
        delete next[id];
      else next[id] = { ...draft, values };
    }
    if (Object.keys(next).length > 100)
      throw new Error(
        "一度に保存できるのは100件までです。先に変更を保存してください。",
      );
    setDrafts(next);
    setFeedback("");
  }
  function selectCell(cell: CellAddress, extend = false) {
    select((old) => ({
      anchor:
        extend &&
        old &&
        ids.includes(old.anchor.id) &&
        fields.includes(old.anchor.field)
          ? old.anchor
          : cell,
      end: cell,
    }));
  }
  function focus(cell: CellAddress) {
    const target = grid.current?.querySelector<HTMLInputElement>(
      'input[data-sheet-id="' + cell.id + '"][data-field="' + cell.field + '"]',
    );
    if (!target || target.disabled) return;
    internalFocus.current = true;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    internalFocus.current = false;
  }
  function read(cell: CellAddress) {
    return draftFor(cell.id)?.values[cell.field] ?? "";
  }
  function begin(cell: CellAddress, initial = read(cell)) {
    selectCell(cell);
    if (writable && !lock.current) setEditor({ cell, initial });
  }
  const [conversion, setConversion] = useState<SheetDraft | null>(null);
  function convert(task: TaskRead) {
    const base = byId.get(task.id);
    if (
      task.estimated_basis !== "own" ||
      !base?.current.method ||
      !writable ||
      lock.current
    )
      return;
    if (count >= 100) {
      toast.error("先に100件の変更を保存してください。");
      return;
    }
    setConversion({
      base,
      title: task.title,
      values: startingValues(base, method),
    });
  }
  function confirmConversion() {
    if (!conversion || !writable || lock.current) return;
    if (
      conversion.base.task_id === detailId &&
      document.querySelector(
        'aside [data-effort-dirty="true"], aside [data-effort-pending="true"]',
      )
    ) {
      setConversion(null);
      toast.error("先に詳細の編集を保存または取り消してください。");
      return;
    }
    setDrafts({ ...drafts, [conversion.base.task_id]: conversion });
    setConversion(null);
    setFeedback("");
  }
  function applyText(text: string, cell: CellAddress, fill = false) {
    const parsed = fromTsv(text);
    const selected =
      range &&
      selection &&
      ids.indexOf(cell.id) >= range.top &&
      ids.indexOf(cell.id) <= range.bottom &&
      fields.indexOf(cell.field) >= range.left &&
      fields.indexOf(cell.field) <= range.right
        ? range
        : bounds(ids, fields, cell, cell);
    if (!selected) return;
    const scalar = parsed.length === 1 && parsed[0].length === 1;
    const height =
      scalar || fill ? selected.bottom - selected.top + 1 : parsed.length;
    const width =
      scalar || fill ? selected.right - selected.left + 1 : parsed[0].length;
    if (
      selected.top + height > ids.length ||
      selected.left + width > fields.length
    )
      throw new Error("貼り付け範囲が表示中の入力セルを超えています。");
    if (
      !scalar &&
      rangeSize > 1 &&
      (height !== selected.bottom - selected.top + 1 ||
        width !== selected.right - selected.left + 1)
    )
      throw new Error("コピー元と選択範囲の行数・列数を合わせてください。");
    const changes = [];
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++) {
        const field = fields[selected.left + c],
          value = (scalar ? parsed[0][0] : parsed[fill ? 0 : r][c]).trim();
        const error = fieldError(field, value);
        if (error) throw new Error(error);
        changes.push({ cell: { id: ids[selected.top + r], field }, value });
      }
    update(changes);
    setEditor(null);
    select({ anchor: changes[0].cell, end: changes[changes.length - 1].cell });
  }
  function copy(e: ClipboardEvent<HTMLInputElement>, cell: CellAddress) {
    if (
      editor &&
      e.currentTarget.selectionStart !== e.currentTarget.selectionEnd &&
      rangeSize <= 1
    )
      return;
    const rect = range ?? bounds(ids, fields, cell, cell);
    if (!rect) return;
    const matrix = ids
      .slice(rect.top, rect.bottom + 1)
      .map((id) =>
        fields
          .slice(rect.left, rect.right + 1)
          .map((field) => read({ id, field })),
      );
    e.clipboardData.setData("text/plain", toTsv(matrix));
    e.preventDefault();
  }
  function fillDown() {
    if (!range || !selection || range.bottom === range.top) return;
    const first = fields
      .slice(range.left, range.right + 1)
      .map((field) => read({ id: ids[range.top], field }));
    try {
      applyText(toTsv([first]), selection.end, true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function key(
    e: KeyboardEvent<HTMLInputElement>,
    cell: CellAddress,
    editing: boolean,
  ) {
    if (e.nativeEvent.isComposing) return;
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "d" &&
      rangeSize > 1
    ) {
      e.preventDefault();
      fillDown();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (editing && editor) update([{ cell, value: editor.initial }]);
      setEditor(null);
      selectCell(cell);
      return;
    }
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      if (editing) setEditor(null);
      else {
        begin(cell);
        e.currentTarget.select();
      }
      return;
    }
    if (e.key === "Tab") {
      const editable = ids
        .filter((id) => draftFor(id))
        .flatMap((id) => fields.map((field) => ({ id, field })));
      const i = editable.findIndex(
          (c) => c.id === cell.id && c.field === cell.field,
        ),
        next = editable[i + (e.shiftKey ? -1 : 1)];
      setEditor(null);
      if (next) {
        e.preventDefault();
        focus(next);
        begin(next);
        grid.current?.querySelector<HTMLInputElement>("input:focus")?.select();
      }
      return;
    }
    if (!editing && e.key.startsWith("Arrow")) {
      const r =
        ids.indexOf(cell.id) +
        (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0);
      const c =
        fields.indexOf(cell.field) +
        (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);
      if (ids[r] != null && fields[c] && draftFor(ids[r])) {
        e.preventDefault();
        const next = { id: ids[r], field: fields[c] };
        focus(next);
        selectCell(next, e.shiftKey);
      }
      return;
    }
    if (
      !editing &&
      (e.key.length === 1 || e.key === "Delete" || e.key === "Backspace") &&
      writable &&
      draftFor(cell.id)
    ) {
      e.preventDefault();
      begin(cell);
      try {
        update([{ cell, value: e.key.length === 1 ? e.key : "" }]);
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
  }
  function input(task: TaskRead, field: SheetField) {
    const cell = { id: task.id, field },
      draft = draftFor(task.id);
    const editing = editor?.cell.id === task.id && editor.cell.field === field;
    const r = ids.indexOf(cell.id),
      c = fields.indexOf(field);
    const selected =
      !!range &&
      r >= range.top &&
      r <= range.bottom &&
      c >= range.left &&
      c <= range.right;
    return (
      <input
        data-sheet-id={task.id}
        data-field={field}
        data-range={selected || undefined}
        aria-label={task.title + "の" + sheetLabels[field]}
        inputMode={field === "referenceWork" ? "text" : "decimal"}
        value={draft?.values[field] ?? ""}
        placeholder="未入力"
        autoComplete="off"
        readOnly={!editing || pending || !writable}
        disabled={!draft || pending}
        onFocus={() => {
          if (!internalFocus.current) selectCell(cell);
        }}
        onMouseDown={(e) => {
          if (e.shiftKey) {
            e.preventDefault();
            focus(cell);
            selectCell(cell, true);
            setEditor(null);
          }
        }}
        onClick={(e) => {
          if (!e.shiftKey && writable && !editing) {
            begin(cell);
            e.currentTarget.select();
          }
        }}
        onBlur={() => setEditor(null)}
        onKeyDown={(e) => key(e, cell, !!editing)}
        onChange={(e) => {
          try {
            update([{ cell, value: e.target.value }]);
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
        onCopy={(e) => copy(e, cell)}
        onPaste={(e) => {
          if (!writable || pending) return;
          e.preventDefault();
          try {
            applyText(e.clipboardData.getData("text/plain"), cell);
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
    );
  }
  async function discard() {
    if (
      lock.current ||
      (count &&
        !window.confirm(
          "一覧の未保存の見積を破棄して、保存済みの値を読み直しますか？",
        ))
    )
      return;
    setEditor(null);
    setDrafts({});
    setFeedback("");
    await invalidateTaskProjectSurfaces(client, projectId);
  }
  async function save() {
    if (!writable || !count || lock.current) return;
    for (const d of entries) {
      const reason = draftError(d.values);
      if (reason) {
        setFeedback(d.title + "：" + reason);
        return;
      }
    }
    lock.current = true;
    setPending(true);
    setEditor(null);
    setFeedback("");
    try {
      await updateEstimateWorksheetProjectsProjectIdEstimateWorksheetPatch(
        projectId,
        { rows: entries.map(worksheetChange) },
      );
      setDrafts({});
      await Promise.all([
        invalidateTaskProjectSurfaces(client, projectId),
        ...entries.map((d) =>
          client.invalidateQueries({
            queryKey: getGetTaskEstimateTasksTaskIdEstimateGetQueryKey(
              d.base.task_id,
            ),
          }),
        ),
      ]);
      setFeedback(count + "件の見積を保存しました。");
    } catch (e) {
      const text =
        e instanceof ApiError && e.status === 409
          ? "他の更新と競合しました。入力をコピーしてから「変更を破棄」で最新版を読み直してください。"
          : e instanceof ApiError && e.status === 403
            ? "保存する権限がありません。入力は表に残っています。"
            : "保存を確認できませんでした。入力を保持しています。接続を確認して再試行してください。";
      setFeedback(text);
      toast.error(text);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return {
    method,
    input,
    convert,
    conversion,
    cancelConversion: () => setConversion(null),
    confirmConversion,
    drafts,
    byId,
    fields,
    save,
    discard,
    count,
    pending,
    feedback,
    fillDown,
    canFill: !!range && range.bottom > range.top,
  };
}
