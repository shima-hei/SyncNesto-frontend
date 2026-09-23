"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CellStyle, DesignLayout } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import { textHeight } from "../../lib/row-height";
import {
  readClipboard,
  toHtml,
  toTsv,
  type ClipboardCell,
} from "../../lib/clipboard";

export type GridColumn = {
  key: string;
  label: string;
  options?: string[];
  readOnly?: boolean;
};
export type GridRow = {
  id: string;
  values: Record<string, string>;
  sectionStart?: boolean;
  spacer?: boolean;
};
export type CellEdit = {
  row: number;
  key: string;
  value: string;
  style?: CellStyle;
};
type Point = { row: number; col: number };
type Props = {
  columnAddLabel?: string;
  focusRowId?: string;
  renderCell?: (row: GridRow, column: GridColumn) => ReactNode;
  toggleOnClick?: boolean;
  toggleStartRow?: number;
  appendRow?: boolean;
  onSelection?: (rowId: string, columnKey: string) => void;
  onToggle?: (row: number, key: string) => void;
  canDeleteColumn?: (key: string) => boolean;
  sheet: string;
  columns: GridColumn[];
  rows: GridRow[];
  layout: DesignLayout;
  readOnly: boolean;
  onEdit: (edits: CellEdit[], requiredRows: number) => void;
  onLayout: (layout: DesignLayout) => void;
  onAdd: () => void;
  onDelete: (ids: string[]) => void;
  onInsert?: (beforeId: string, spacer: boolean) => void;
  onAddColumn?: () => void;
  onDeleteColumn?: (key: string) => void;
  onUndo: () => void;
  onRedo: () => void;
};

export function DesignGrid({
  sheet,
  columns,
  rows: dataRows,
  layout,
  readOnly,
  onEdit,
  onLayout,
  onAdd,
  onDelete,
  onInsert,
  onAddColumn,
  onDeleteColumn,
  onUndo,
  onRedo,
  appendRow = false,
  onSelection,
  onToggle,
  canDeleteColumn = (key) => key.startsWith("custom_"),
  renderCell,
  toggleOnClick = false,
  toggleStartRow = 4,
  focusRowId,
  columnAddLabel = "列を追加",
}: Props) {
  const dataLength = dataRows.length;
  const rows = useMemo(
    () =>
      appendRow && !readOnly && dataRows.length < 10000
        ? [...dataRows, { id: "new-item", values: {} }]
        : dataRows,
    [dataRows, appendRow, readOnly],
  );
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [initialPoint] = useState(() => ({
    row: Math.max(
      0,
      dataRows.findIndex((r) => r.id === focusRowId),
    ),
    col: focusRowId || appendRow ? 2 : 0,
  }));
  const [anchorState, setAnchor] = useState<Point>(initialPoint);
  const [activeState, setActive] = useState<Point>(initialPoint);
  const clampPoint = (point: Point): Point => ({
    row: Math.max(0, Math.min(rows.length - 1, point.row)),
    col: Math.max(0, Math.min(columns.length - 1, point.col)),
  });
  const anchor = clampPoint(anchorState);
  const active = clampPoint(activeState);
  useEffect(() => {
    if (container.current)
      container.current.scrollTop = Math.max(0, initialPoint.row * 36 - 100);
  }, [initialPoint]);
  const [editing, setEditing] = useState<{
    point: Point;
    value: string;
    select?: boolean;
  } | null>(null);
  const editingRef = useRef(editing);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const blurPending = useRef(false);
  useLayoutEffect(() => {
    const node = input.current;
    if (!node || composing.current) return;
    const value = editing?.value ?? "";
    if (node.value !== value) {
      node.value = value;
      node.setSelectionRange(value.length, value.length);
    }
  }, [editing, active.row, active.col]);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const [scrollTop, setScrollTop] = useState(0);
  const [horizontal, setHorizontal] = useState({ left: 0, width: 1600 });
  const [dragSize, setDragSize] = useState<{
    key: string;
    value: number;
    row: boolean;
  } | null>(null);
  const minRow = Math.min(anchor.row, active.row),
    maxRow = Math.min(rows.length - 1, Math.max(anchor.row, active.row));
  const minCol = Math.min(anchor.col, active.col),
    maxCol = Math.min(columns.length - 1, Math.max(anchor.col, active.col));
  const styleKey = (r: string, key: string) => `${sheet}:${r}:${key}`;
  const autoHeights = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          row.id,
          Math.max(
            36,
            ...Object.entries(row.values).map(([key, value]) =>
              textHeight(value, layout.widths?.[`${sheet}:${key}`] ?? 180),
            ),
          ),
        ]),
      ),
    [rows, layout.widths, sheet],
  );
  const height = (row: GridRow) =>
    Math.max(
      autoHeights.get(row.id) ?? 36,
      editing && rows[editing.point.row]?.id === row.id
        ? textHeight(
            editing.value,
            layout.widths?.[`${sheet}:${columns[editing.point.col].key}`] ??
              180,
          )
        : 36,
      dragSize?.row && dragSize.key === row.id
        ? dragSize.value
        : (layout.heights?.[`${sheet}:${row.id}`] ?? 36),
    );
  const offsets = (() => {
    const result = [0];
    rows.forEach((row) => result.push(result.at(-1)! + height(row)));
    return result;
  })();
  let first = 0;
  while (first < rows.length && offsets[first + 1] < scrollTop - 150) first++;
  let last = first;
  while (last < rows.length && offsets[last] < scrollTop + 850) last++;
  const width = (key: string) =>
    !dragSize?.row && dragSize?.key === key
      ? dragSize.value
      : (layout.widths?.[`${sheet}:${key}`] ?? 180);
  const totalWidth = columns.reduce((n, c) => n + width(c.key), 48);
  let columnLeft = 48;
  const visibleColumns: { column: GridColumn; c: number; left: number }[] = [];
  for (let c = 0; c < columns.length; c++) {
    const column = columns[c];
    const left = columnLeft;
    columnLeft += width(column.key);
    if (
      sheet !== "matrix" ||
      c < 2 ||
      (columnLeft >= horizontal.left - 300 &&
        left < horizontal.left + horizontal.width + 300)
    )
      visibleColumns.push({ column, c, left });
  }

  function select(point: Point, extend = false) {
    const next = {
      row: Math.max(0, Math.min(rows.length - 1, point.row)),
      col: Math.max(0, Math.min(columns.length - 1, point.col)),
    };
    setActive(next);
    if (rows[next.row] && columns[next.col])
      onSelection?.(rows[next.row].id, columns[next.col].key);
    if (!extend) setAnchor(next);
    const el = container.current;
    if (el) {
      const top = offsets[next.row] ?? 0;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + 80 > el.scrollTop + el.clientHeight)
        el.scrollTop = top + 80 - el.clientHeight;
      const left = columns
        .slice(0, next.col)
        .reduce((n, c) => n + width(c.key), 48);
      const frozenWidth =
        sheet === "matrix" && next.col >= 2
          ? columns.slice(0, 2).reduce((n, c) => n + width(c.key), 48)
          : 0;
      if (left < el.scrollLeft + frozenWidth)
        el.scrollLeft = Math.max(0, left - frozenWidth);
      else if (
        left + width(columns[next.col]?.key ?? "") >
        el.scrollLeft + el.clientWidth
      )
        el.scrollLeft =
          left + width(columns[next.col]?.key ?? "") - el.clientWidth;
    }
  }

  function commit() {
    if (composing.current) return;
    const edit = editingRef.current;
    if (!edit) return;
    editingRef.current = null;
    setEditing(null);
    const key = columns[edit.point.col]?.key;
    if (key && rows[edit.point.row] && !columns[edit.point.col].readOnly)
      onEdit([{ row: edit.point.row, key, value: edit.value }], rows.length);
  }

  function move(key: string, shift: boolean) {
    let { row, col } = active;
    if (key === "Tab") {
      col += shift ? -1 : 1;
      if (col >= columns.length) {
        col = 0;
        row++;
      }
      if (col < 0) {
        col = columns.length - 1;
        row--;
      }
    } else if (key === "Enter") row += shift ? -1 : 1;
    else if (key === "ArrowDown") row++;
    else if (key === "ArrowUp") row--;
    else if (key === "ArrowLeft") col--;
    else if (key === "ArrowRight") col++;
    if (appendRow && row >= rows.length && editingRef.current === null) {
      setActive({ row, col });
      setAnchor({ row, col });
    } else select({ row, col }, shift && key.startsWith("Arrow"));
  }

  function clear() {
    if (readOnly) return;
    const edits: CellEdit[] = [];
    for (let r = minRow; r <= maxRow; r++)
      for (let c = minCol; c <= maxCol; c++)
        edits.push({ row: r, key: columns[c].key, value: "" });
    onEdit(edits, rows.length);
  }

  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229)
      return;
    if (e.target !== e.currentTarget && e.target !== input.current) {
      if ((e.target as HTMLElement).tagName === "SELECT" && e.key === "Tab") {
        e.preventDefault();
        move(e.key, e.shiftKey);
        container.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (editing) return;
    if (e.key === " " && onToggle && !readOnly) {
      e.preventDefault();
      onToggle(active.row, columns[active.col].key);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (!readOnly) (e.shiftKey ? onRedo : onUndo)();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      if (!readOnly) onRedo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setAnchor({ row: 0, col: 0 });
      setActive({ row: rows.length - 1, col: columns.length - 1 });
      return;
    }
    if (
      [
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Tab",
      ].includes(e.key)
    ) {
      if (
        e.key === "Tab" &&
        (!rows.length ||
          (e.shiftKey && active.row === 0 && active.col === 0) ||
          (!e.shiftKey &&
            active.row === rows.length - 1 &&
            active.col === columns.length - 1))
      )
        return;
      e.preventDefault();
      move(e.key, e.shiftKey);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      clear();
      return;
    }
    if (
      !readOnly &&
      !columns[active.col]?.readOnly &&
      rows[active.row] &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      e.key === "F2"
    ) {
      e.preventDefault();
      const selector = container.current?.querySelector<HTMLSelectElement>(
        `[id="${sheet}-${active.row}-${active.col}"] select`,
      );
      if (selector) {
        selector.focus({ preventScroll: true });
        return;
      }
      flushSync(() =>
        setEditing({
          point: active,
          select: !!columns[active.col].options,
          value: rows[active.row].values[columns[active.col].key] ?? "",
        }),
      );
    }
  }

  function copy(e: ClipboardEvent, cut: boolean) {
    if (editing || (cut && readOnly)) return;
    const data: ClipboardCell[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      data.push([]);
      for (let c = minCol; c <= maxCol; c++)
        data.at(-1)!.push({
          value: rows[r].values[columns[c].key] ?? "",
          style: layout.cells?.[styleKey(rows[r].id, columns[c].key)],
        });
    }
    e.preventDefault();
    e.clipboardData.setData("text/plain", toTsv(data));
    e.clipboardData.setData("text/html", toHtml(data));
    if (cut) clear();
  }

  function paste(e: ClipboardEvent) {
    if (readOnly || editing) return;
    e.preventDefault();
    if (
      e.clipboardData.getData("text/plain").length > 5_000_000 ||
      e.clipboardData.getData("text/html").length > 5_000_000
    ) {
      toast.error("貼り付けデータが大きすぎます");
      return;
    }
    const data = readClipboard(e.clipboardData);
    if (
      minRow + data.length > 10000 ||
      data.some((r) => r.length + minCol > columns.length)
    ) {
      toast.error("貼り付け先の列が不足しているか、10,000行を超えています");
      return;
    }
    const edits: CellEdit[] = [];
    data.forEach((row, r) =>
      row.forEach((cell, c) =>
        edits.push({ row: minRow + r, key: columns[minCol + c].key, ...cell }),
      ),
    );
    onEdit(edits, Math.max(rows.length, minRow + data.length));
  }

  function format(style: CellStyle) {
    const cells = { ...layout.cells };
    for (let r = minRow; r <= maxRow; r++)
      for (let c = minCol; c <= maxCol; c++) {
        const key = styleKey(rows[r].id, columns[c].key);
        cells[key] = { ...cells[key], ...style };
      }
    onLayout({ ...layout, cells });
    container.current?.focus({ preventScroll: true });
  }

  function resize(
    e: React.PointerEvent,
    key: string,
    isRow: boolean,
    initial: number,
  ) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const start = isRow ? e.clientY : e.clientX;
    let value = initial;
    const onMove = (event: PointerEvent) => {
      value = Math.round(
        Math.max(
          isRow ? 28 : 60,
          Math.min(
            isRow ? 300 : 1200,
            initial + (isRow ? event.clientY : event.clientX) - start,
          ),
        ),
      );
      setDragSize({ key, row: isRow, value });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragSize(null);
      const field = isRow ? "heights" : "widths";
      onLayout({
        ...layout,
        [field]: { ...layout[field], [`${sheet}:${key}`]: value },
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  const currentStyle =
    rows[active.row] && columns[active.col]
      ? layout.cells?.[styleKey(rows[active.row].id, columns[active.col].key)]
      : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2 shadow-sm"
        aria-label="表編集ツール"
      >
        {onInsert && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={readOnly}
              onClick={() => onInsert(rows[active.row]?.id ?? "", false)}
            >
              この行の上に項目を挿入
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={readOnly}
              onClick={() => onInsert(rows[active.row]?.id ?? "", true)}
            >
              この行の上に区切り行を挿入
            </Button>
          </>
        )}
        {!appendRow && (
          <Button
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={onAdd}
          >
            行を追加
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly || !rows.length}
          onClick={() =>
            onDelete(rows.slice(minRow, maxRow + 1).map((r) => r.id))
          }
        >
          選択行を削除
        </Button>
        {onAddColumn && (
          <Button
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={onAddColumn}
          >
            {columnAddLabel}
          </Button>
        )}
        {onDeleteColumn && (
          <Button
            size="sm"
            variant="outline"
            disabled={
              readOnly || !canDeleteColumn(columns[active.col]?.key ?? "")
            }
            onClick={() => onDeleteColumn(columns[active.col].key)}
          >
            選択列を削除
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly}
          aria-pressed={currentStyle?.bold ?? false}
          className={cn(currentStyle?.bold && "border-primary bg-primary/10")}
          onClick={() => format({ bold: !currentStyle?.bold })}
        >
          太字
        </Button>
        <label className="flex items-center gap-1 text-sm">
          配置
          <select
            aria-label="文字配置"
            disabled={readOnly}
            value={currentStyle?.align ?? "left"}
            onChange={(e) =>
              format({ align: e.target.value as CellStyle["align"] })
            }
          >
            <option value="left">左</option>
            <option value="center">中央</option>
            <option value="right">右</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          背景
          <input
            aria-label="背景色"
            type="color"
            className="h-7 w-9"
            disabled={readOnly}
            value={currentStyle?.background ?? "#ffffff"}
            onChange={(e) => format({ background: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          文字
          <input
            aria-label="文字色"
            type="color"
            className="h-7 w-9"
            disabled={readOnly}
            value={currentStyle?.color ?? "#000000"}
            onChange={(e) => format({ color: e.target.value })}
          />
        </label>
        <label className="text-sm">
          列幅
          <input
            aria-label="列幅"
            type="number"
            min={60}
            max={1200}
            className="w-16"
            disabled={readOnly}
            value={width(columns[active.col]?.key ?? "")}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 60 && n <= 1200)
                onLayout({
                  ...layout,
                  widths: {
                    ...layout.widths,
                    [`${sheet}:${columns[active.col].key}`]: n,
                  },
                });
            }}
          />
        </label>
        <label className="text-sm">
          行高
          <input
            aria-label="行高"
            type="number"
            min={28}
            max={300}
            className="w-16"
            disabled={readOnly || !rows[active.row]}
            value={rows[active.row] ? height(rows[active.row]) : 36}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 28 && n <= 300 && rows[active.row])
                onLayout({
                  ...layout,
                  heights: {
                    ...layout.heights,
                    [`${sheet}:${rows[active.row].id}`]: n,
                  },
                });
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {dataLength}行 {appendRow && "· 末尾の空行へ入力すると項目を作成"} ·
        ドラッグ / Shift＋矢印で範囲選択 · F2 / ダブルクリックで編集 ·
        Alt＋Enterでセル内改行 · Enterで下、Tabで右へ移動 · Ctrl/⌘＋C/X/V/Z ·
        Escで編集取消
      </p>
      <div
        ref={container}
        role="grid"
        aria-label={`${sheet}の表`}
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length + 1}
        aria-readonly={readOnly}
        aria-activedescendant={
          rows[active.row] ? `${sheet}-${active.row}-${active.col}` : undefined
        }
        tabIndex={0}
        className="relative h-[560px] max-w-full overflow-auto rounded-md border outline-none focus:ring-2 focus:ring-ring"
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
          setHorizontal({
            left: e.currentTarget.scrollLeft,
            width: e.currentTarget.clientWidth,
          });
        }}
        onKeyDown={keyDown}
        onFocus={(e) => {
          if (e.target === e.currentTarget)
            input.current?.focus({ preventScroll: true });
        }}
        onCopy={(e) => copy(e, false)}
        onCut={(e) => copy(e, true)}
        onPaste={paste}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerLeave={() => {
          dragging.current = false;
        }}
      >
        <textarea
          ref={input}
          tabIndex={-1}
          aria-label={`${active.row + 1}行目 ${columns[active.col]?.label ?? "セル"}`}
          readOnly={
            readOnly || columns[active.col]?.readOnly || !rows[active.row]
          }
          className={cn(
            "absolute z-20 resize-none bg-background p-1 text-sm text-foreground outline-none",
            (!editing || editing.select) && "pointer-events-none opacity-0",
          )}
          style={{
            left:
              columns
                .slice(0, active.col)
                .reduce((n, c) => n + width(c.key), 48) +
              (sheet === "matrix" && active.col < 2 ? horizontal.left : 0),
            top: 36 + (offsets[active.row] ?? 0),
            width: width(columns[active.col]?.key ?? ""),
            height: rows[active.row] ? height(rows[active.row]) : 36,
          }}
          onCompositionStart={() => {
            composing.current = true;
            if (!editingRef.current) {
              const next = { point: active, value: input.current?.value ?? "" };
              editingRef.current = next;
              setEditing(next);
            }
          }}
          onCompositionEnd={(e) => {
            composing.current = false;
            const next = { point: active, value: e.currentTarget.value };
            editingRef.current = next;
            setEditing(next);
            if (blurPending.current)
              queueMicrotask(() => {
                blurPending.current = false;
                commit();
              });
          }}
          onChange={(e) => {
            const next = { point: active, value: e.currentTarget.value };
            editingRef.current = next;
            setEditing(next);
          }}
          onBlur={(e) => {
            if (
              (e.relatedTarget as HTMLElement | null)?.tagName === "SELECT" &&
              columns[active.col]?.options
            )
              return;
            if (composing.current) blurPending.current = true;
            else commit();
          }}
          onKeyDown={(e) => {
            if (
              composing.current ||
              e.nativeEvent.isComposing ||
              e.keyCode === 229
            ) {
              e.stopPropagation();
              return;
            }
            if (!editingRef.current) return;
            e.stopPropagation();
            if (e.key === "Enter" && e.altKey) {
              e.preventDefault();
              const node = e.currentTarget;
              const start = node.selectionStart;
              node.setRangeText("\n", start, node.selectionEnd, "end");
              const next = { point: active, value: node.value };
              editingRef.current = next;
              setEditing(next);
            } else if (e.key === "Escape") {
              e.preventDefault();
              editingRef.current = null;
              setEditing(null);
            } else if (e.key === "Tab" || e.key === "Enter") {
              e.preventDefault();
              commit();
              move(e.key, e.shiftKey);
            }
          }}
        />
        <div
          role="row"
          className="sticky top-0 z-10 flex h-9 bg-muted"
          style={{ width: totalWidth }}
        >
          <div role="columnheader" className="w-12 shrink-0 border-r" />
          {visibleColumns.map(({ column, c, left }) => (
            <div
              role="columnheader"
              key={column.key}
              className="relative shrink-0 truncate border-r px-2 py-2 text-xs font-medium"
              style={{
                width: width(column.key),
                ...(sheet === "matrix"
                  ? ({
                      position: c < 2 ? "sticky" : "absolute",
                      left,
                      zIndex: c < 2 ? 2 : 0,
                      background: "var(--muted)",
                    } as const)
                  : {}),
              }}
              onClick={() => {
                setAnchor({ row: 0, col: c });
                setActive({ row: rows.length - 1, col: c });
                onSelection?.(rows[active.row]?.id ?? "", column.key);
                container.current?.focus({ preventScroll: true });
              }}
            >
              {column.label}
              <span
                role="separator"
                aria-label={`${column.label}の幅`}
                aria-orientation="vertical"
                className="absolute inset-y-0 right-0 w-1 cursor-col-resize"
                onPointerDown={(e) =>
                  resize(e, column.key, false, width(column.key))
                }
              />
            </div>
          ))}
          {sheet === "matrix" && onAddColumn && (
            <button
              type="button"
              aria-label="組み合わせ列を追加"
              disabled={readOnly}
              className="absolute top-0 h-9 w-10 border bg-muted text-lg"
              style={{ left: totalWidth }}
              onClick={onAddColumn}
            >
              ＋
            </button>
          )}
        </div>
        <div
          style={{
            height: offsets.at(-1),
            width: totalWidth,
            position: "relative",
          }}
        >
          {rows.slice(first, last).map((row, index) => {
            const r = first + index;
            return (
              <div
                role="row"
                aria-rowindex={r + 2}
                key={row.id}
                className={cn("absolute flex", row.spacer && "bg-muted/60")}
                style={{
                  top: offsets[r],
                  height: height(row),
                  width: totalWidth,
                }}
              >
                <div
                  role="rowheader"
                  className="relative w-12 shrink-0 border-b border-r bg-muted p-2 text-xs"
                  onClick={() => {
                    setAnchor({ row: r, col: 0 });
                    setActive({ row: r, col: columns.length - 1 });
                    onSelection?.(row.id, columns[active.col]?.key ?? "");
                    container.current?.focus({ preventScroll: true });
                  }}
                >
                  {row.spacer ? "区切" : r + 1}
                  <span
                    role="separator"
                    aria-label={`${r + 1}行目の高さ`}
                    aria-orientation="horizontal"
                    className="absolute inset-x-0 bottom-0 h-1 cursor-row-resize"
                    onPointerDown={(e) => resize(e, row.id, true, height(row))}
                  />
                </div>
                {visibleColumns.map(({ column: col, c, left }) => {
                  const selected =
                    r >= minRow && r <= maxRow && c >= minCol && c <= maxCol;
                  const s = layout.cells?.[styleKey(row.id, col.key)];
                  const isEditing =
                    editing?.point.row === r && editing.point.col === c;
                  return (
                    <div
                      role="gridcell"
                      id={`${sheet}-${r}-${c}`}
                      aria-colindex={c + 2}
                      aria-selected={selected}
                      key={col.key}
                      className={cn(
                        "relative shrink-0 overflow-hidden whitespace-pre-wrap border-b border-r px-2 py-1 text-sm",
                        row.sectionStart && "border-t-2 border-t-foreground/50",
                        row.spacer && "border-b-2 border-b-border/80",
                        selected && "ring-1 ring-inset ring-primary",
                        active.row === r && active.col === c && "ring-2",
                      )}
                      style={{
                        width: width(col.key),
                        ...(sheet === "matrix"
                          ? ({
                              position: c < 2 ? "sticky" : "absolute",
                              left,
                              height: "100%",
                              zIndex: c < 2 ? 1 : 0,
                            } as const)
                          : {}),
                        fontWeight: s?.bold
                          ? 700
                          : sheet === "matrix" && c >= 2 && r >= toggleStartRow
                            ? 600
                            : 400,
                        fontSize:
                          sheet === "matrix" && c >= 2 && r >= toggleStartRow
                            ? 20
                            : undefined,
                        textAlign:
                          s?.align ??
                          (sheet === "matrix" && c >= 2 && r >= toggleStartRow
                            ? "center"
                            : undefined),
                        backgroundColor:
                          s?.background ??
                          (selected
                            ? "var(--accent)"
                            : sheet === "matrix" && c < 2
                              ? "var(--background)"
                              : undefined),
                        color:
                          s?.color ??
                          (r > 0 &&
                          row.values[col.key] &&
                          row.values[col.key] === rows[r - 1].values[col.key]
                            ? "var(--muted-foreground)"
                            : undefined),
                      }}
                      onPointerDown={(e) => {
                        if (composing.current) {
                          e.preventDefault();
                          return;
                        }
                        if (isEditing) return;
                        if (
                          (e.target as HTMLElement).closest("select,button")
                        ) {
                          commit();
                          select({ row: r, col: c });
                          return;
                        }
                        e.preventDefault();
                        commit();
                        select({ row: r, col: c }, e.shiftKey);
                        dragging.current = true;
                        container.current?.focus({ preventScroll: true });
                      }}
                      onPointerEnter={(e) => {
                        if (dragging.current && e.buttons === 1)
                          select({ row: r, col: c }, true);
                      }}
                      onDoubleClick={() => {
                        if (col.readOnly) return;
                        if (toggleOnClick && c >= 2 && r >= toggleStartRow)
                          return;
                        if (
                          !readOnly &&
                          onToggle &&
                          c >= 2 &&
                          r >= toggleStartRow
                        )
                          onToggle(r, col.key);
                        else if (!readOnly)
                          setEditing({
                            point: { row: r, col: c },
                            select: !!col.options,
                            value: row.values[col.key] ?? "",
                          });
                      }}
                      onClick={(e) => {
                        if (
                          toggleOnClick &&
                          !isEditing &&
                          !readOnly &&
                          c >= 2 &&
                          r >= toggleStartRow &&
                          !e.shiftKey &&
                          e.detail === 1 &&
                          minRow === maxRow &&
                          minCol === maxCol
                        )
                          onToggle?.(r, col.key);
                      }}
                    >
                      {isEditing ? (
                        <>
                          {col.options && editing.select && (
                            <select
                              aria-label={`${col.label}の候補`}
                              className="absolute inset-0 size-full bg-background"
                              autoFocus
                              onKeyDown={(e) => e.stopPropagation()}
                              onBlur={commit}
                              value={editing.value}
                              onChange={(e) => {
                                onEdit(
                                  [
                                    {
                                      row: r,
                                      key: col.key,
                                      value: e.target.value,
                                    },
                                  ],
                                  rows.length,
                                );
                                editingRef.current = null;
                                setEditing(null);
                                container.current?.focus({
                                  preventScroll: true,
                                });
                              }}
                            >
                              <option value="">未選択</option>
                              {col.options.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      ) : (
                        (renderCell?.(row, col) ?? row.values[col.key])
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
