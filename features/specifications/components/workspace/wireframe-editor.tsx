"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  CopyIcon,
  GripIcon,
  MaximizeIcon,
  PlusIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ScreenEvent,
  ScreenState,
  SpecificationField,
  WireframeArtboard,
  WireframeComponent,
} from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import {
  applyWireframePart,
  enclosingPart,
  wireframePartDefinition,
  wireframeSubtree,
} from "../../lib/wireframe-parts";
import { WireframePartDialog } from "./wireframe-part-dialog";

const componentLabels = {
  text: "テキスト",
  heading: "見出し",
  button: "ボタン",
  input: "テキスト入力",
  number: "数値入力",
  textarea: "テキストエリア",
  select: "セレクト",
  checkbox: "チェックボックス",
  radio: "ラジオボタン",
  date: "日付入力",
  file: "ファイル入力",
  table: "テーブル",
  image: "画像",
  icon: "アイコン",
  tabs: "タブ",
  modal: "モーダル",
  drawer: "ドロワー",
  menu: "メニュー",
  pagination: "ページ送り",
  divider: "区切り線",
  container: "コンテナ",
  chart: "グラフ",
} as const;

const layouts = {
  free: "自由配置",
  vertical: "縦並び",
  horizontal: "横並び",
  grid: "グリッド",
} as const;
const selectStyle =
  "h-8 min-w-0 max-w-full rounded-md border bg-background px-2 text-sm";
type Layer = NonNullable<WireframeComponent["kind"]>;
type Layout = NonNullable<WireframeComponent["layout"]>;

function part(kind: Layer, index = 0): WireframeComponent {
  return {
    id: crypto.randomUUID(),
    kind,
    name: componentLabels[kind],
    x: 16 + (index % 6) * 20,
    y: 22 + (index % 6) * 36,
    width: kind === "container" || kind === "table" ? 320 : 164,
    height: kind === "container" || kind === "table" ? 150 : 42,
  };
}

function dimensions(
  layout: Layout,
  properties?: WireframeComponent,
): CSSProperties {
  const gap = properties?.gap ?? 8;
  const padding = properties?.padding ?? 8;
  if (layout === "free") return { position: "relative" };
  if (layout === "grid")
    return {
      display: "grid",
      gridTemplateColumns: `repeat(${properties?.columns ?? 2}, minmax(0, 1fr))`,
      gap,
      padding,
      alignContent: "start",
    };
  return {
    display: "flex",
    flexDirection: layout === "vertical" ? "column" : "row",
    gap,
    padding,
  };
}

function componentPreview(item: WireframeComponent, text: string) {
  switch (item.kind) {
    case "heading":
      return <strong className="text-lg">{text}</strong>;
    case "button":
      return (
        <span className="rounded bg-slate-800 px-3 py-1 text-white">
          {text}
        </span>
      );
    case "input":
    case "number":
    case "date":
    case "file":
    case "select":
    case "textarea":
      return (
        <div className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-500">
          {text}
          {item.kind === "select" ? " ▾" : ""}
        </div>
      );
    case "checkbox":
    case "radio":
      return (
        <span>
          <span aria-hidden="true">
            {item.kind === "checkbox" ? "□ " : "◯ "}
          </span>
          {text}
        </span>
      );
    case "divider":
      return <hr className="w-full border-slate-300" />;
    case "table":
      return (
        <table className="w-full self-start text-left text-xs">
          <tbody>
            {(item.table_rows?.length
              ? item.table_rows
              : [
                  ["列1", "列2"],
                  ["", ""],
                ]
            ).map((row, index) => (
              <tr
                key={index}
                className={cn(
                  "border-b border-slate-300",
                  !index && "font-semibold",
                )}
              >
                {row.map((cell, column) => (
                  <td key={column} className="border-r border-slate-300 p-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return (
        <span
          className={cn(
            ["image", "chart", "modal", "drawer", "tabs", "menu"].includes(
              item.kind ?? "",
            ) && "w-full border border-dashed border-slate-300 p-1 text-center",
          )}
        >
          {text}
        </span>
      );
  }
}

export function WireframeEditor({
  projectId,
  canRegisterParts,
  items,
  fields,
  events,
  states,
  onChange,
  onCreateReference,
  readOnly,
  onReview,
}: {
  projectId: number;
  canRegisterParts: boolean;
  items: WireframeArtboard[];
  fields: SpecificationField[];
  events: ScreenEvent[];
  states: ScreenState[];
  onChange: (items: WireframeArtboard[]) => void;
  onCreateReference: (
    ...entry:
      | ["field", SpecificationField, WireframeArtboard[]]
      | ["event", ScreenEvent, WireframeArtboard[]]
  ) => void;
  readOnly: boolean;
  onReview?: (path: string) => void;
}) {
  const [boardId, setBoardId] = useState(items[0]?.id);
  const [selection, setSelection] = useState(new Set<string>());
  const [template, setTemplate] = useState("blank");
  const [zoom, setZoom] = useState(1);
  const [large, setLarge] = useState(false);
  const [preview, setPreview] = useState(false);
  const [offset, setOffset] = useState<{
    x: number;
    y: number;
    ids: Set<string>;
    resize: boolean;
  } | null>(null);
  const [history, setHistory] = useState<{
    past: WireframeArtboard[][];
    future: WireframeArtboard[][];
  }>({ past: [], future: [] });
  const clipboard = useRef<WireframeComponent[]>([]);
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    ids: Set<string>;
    resize: boolean;
  } | null>(null);
  const board = items.find((item) => item.id === boardId) ?? items[0];
  const components = board?.components ?? [];
  const active = components.find((item) => item.id && selection.has(item.id));
  const partPlacement = active ? enclosingPart(components, active) : undefined;
  const save = (next: WireframeArtboard[]) => {
    setHistory({ past: [...history.past.slice(-29), items], future: [] });
    onChange(next);
  };
  const updateBoard = (next: WireframeArtboard) =>
    save(items.map((item) => (item.id === next.id ? next : item)));
  const updateComponents = (next: WireframeComponent[]) => {
    if (board) updateBoard({ ...board, components: next });
  };
  const update = (value: WireframeComponent) =>
    updateComponents(
      components.map((item) => (item.id === value.id ? value : item)),
    );
  const undo = (redo = false) => {
    const { past, future } = history;
    const next = redo ? future.at(0) : past.at(-1);
    if (!next) return;
    setHistory(
      redo
        ? { past: [...past, items], future: future.slice(1) }
        : { past: past.slice(0, -1), future: [items, ...future] },
    );
    onChange(next);
  };
  const addBoard = () => {
    const samples: Record<string, Layer[]> = {
      blank: [],
      list: ["heading", "input", "button", "table", "pagination"],
      form: ["heading", "input", "select", "textarea", "button"],
      detail: ["heading", "text", "table", "button"],
      dashboard: ["heading", "chart", "table"],
      login: ["heading", "input", "input", "button"],
    };
    const next: WireframeArtboard = {
      id: crypto.randomUUID(),
      name: `アートボード ${items.length + 1}`,
      width: 1024,
      height: 650,
      layout: template === "blank" ? "free" : "vertical",
      components: samples[template].map((kind, index) => part(kind, index)),
    };
    save([...items, next]);
    setBoardId(next.id);
    setSelection(new Set());
  };
  const add = (kind: Layer, at?: { x: number; y: number }) => {
    const next = { ...part(kind, components.length), ...at };
    updateComponents([...components, next]);
    if (next.id) setSelection(new Set([next.id]));
  };
  const selectedItems = () =>
    components.filter(
      (item) => item.id && selection.has(item.id) && !item.locked,
    );
  const selectionWithParts = () => {
    const selected = selectedItems();
    const roots = new Set(
      selected.flatMap((item) => (item.id && item.part_pin ? [item.id] : [])),
    );
    if (!roots.size) return selected;
    const partLayers = new Set(
      wireframeSubtree(components, roots).map((item) => item.id),
    );
    return components.filter(
      (item) => selected.includes(item) || partLayers.has(item.id),
    );
  };
  const duplicate = (values: WireframeComponent[]) => {
    if (components.length + values.length > 200) return;
    const ids = new Map(values.map((item) => [item.id, crypto.randomUUID()]));
    const created = values.map((item) => ({
      ...item,
      id: ids.get(item.id),
      parent_id:
        ids.get(item.parent_id ?? undefined) ??
        (components.some((entry) => entry.id === item.parent_id)
          ? item.parent_id
          : null),
      x: Math.min(
        10000,
        (item.x ?? 0) + (ids.has(item.parent_id ?? undefined) ? 0 : 16),
      ),
      y: Math.min(
        10000,
        (item.y ?? 0) + (ids.has(item.parent_id ?? undefined) ? 0 : 16),
      ),
      part_pin: item.part_pin
        ? {
            ...item.part_pin,
            layer_ids: Object.fromEntries(
              Object.entries(item.part_pin.layer_ids).flatMap(([key, id]) => {
                const next = ids.get(id);
                return next ? [[key, next]] : [];
              }),
            ),
          }
        : undefined,
    }));
    updateComponents([...components, ...created]);
    setSelection(
      new Set(created.flatMap((item) => (item.id ? [item.id] : []))),
    );
  };
  const remove = () => {
    const removed = new Set(selectionWithParts().map((item) => item.id));
    updateComponents(
      components
        .filter((item) => !removed.has(item.id))
        .map((item) =>
          removed.has(item.parent_id ?? undefined)
            ? { ...item, parent_id: null }
            : item,
        ),
    );
    setSelection(new Set());
  };
  const choose = (id: string, multiple: boolean) => {
    if (!multiple) {
      setSelection(new Set([id]));
      return;
    }
    setSelection((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const begin = (
    event: PointerEvent<HTMLButtonElement>,
    item: WireframeComponent,
    resize = false,
  ) => {
    if (event.button !== 0 || !item.id || item.locked) return;
    event.stopPropagation();
    const ids =
      !resize && selection.has(item.id) ? selection : new Set([item.id]);
    setSelection(ids);
    setDrag({ x: event.clientX, y: event.clientY, ids, resize });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag;
    if (!start) return;
    setOffset({
      x: Math.round((event.clientX - start.x) / zoom),
      y: Math.round((event.clientY - start.y) / zoom),
      ids: start.ids,
      resize: start.resize,
    });
  };
  const moved = (
    source: WireframeComponent,
    delta: { x: number; y: number },
    resize: boolean,
  ) =>
    resize
      ? {
          ...source,
          width: Math.max(16, (source.width ?? 160) + delta.x),
          height: Math.max(16, (source.height ?? 40) + delta.y),
        }
      : {
          ...source,
          x: Math.max(0, (source.x ?? 0) + delta.x),
          y: Math.max(0, (source.y ?? 0) + delta.y),
        };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag;
    if (!start) return;
    const delta = {
      x: Math.round((event.clientX - start.x) / zoom / 8) * 8,
      y: Math.round((event.clientY - start.y) / zoom / 8) * 8,
    };
    if (delta.x || delta.y)
      updateComponents(
        components.map((item) =>
          item.id && start.ids.has(item.id) && !item.locked
            ? moved(item, delta, start.resize)
            : item,
        ),
      );
    setDrag(null);
    setOffset(null);
  };
  const render = (parentId: string | null, layout: Layout): ReactNode =>
    components
      .filter((item) => (item.parent_id ?? null) === parentId && !item.hidden)
      .map((item) => {
        const held = offset && item.id && offset.ids.has(item.id);
        const current = held ? moved(item, offset, offset.resize) : item;
        const selected = Boolean(item.id && selection.has(item.id)) && !preview;
        const title =
          fields.find((field) => item.field_id && field.id === item.field_id)
            ?.name ||
          item.name ||
          "";
        const style: CSSProperties = {
          width: layout === "grid" ? "auto" : (current.width ?? 160),
          height: current.height ?? 40,
          ...(layout === "free"
            ? {
                position: "absolute",
                left: current.x ?? 0,
                top: current.y ?? 0,
              }
            : {}),
          ...(layout === "grid"
            ? { gridColumn: `span ${current.column_span ?? 1}` }
            : {}),
        };
        const handle = (resize: boolean) => (
          <button
            type="button"
            className={cn(
              "absolute z-10 cursor-grab touch-none select-none rounded bg-slate-100 text-slate-800 [-webkit-user-select:none]",
              resize
                ? "right-0 bottom-0 size-4 cursor-se-resize"
                : "top-0 left-0 size-5",
            )}
            aria-label={`${title}を${resize ? "リサイズ" : "移動"}（矢印キーでも操作）`}
            onPointerDown={(event) => begin(event, item, resize)}
            onPointerMove={move}
            onPointerUp={end}
            onLostPointerCapture={() => {
              setDrag(null);
              setOffset(null);
            }}
            onKeyDown={(event) => {
              const deltas: Record<string, { x: number; y: number }> = {
                ArrowLeft: { x: -8, y: 0 },
                ArrowUp: { x: 0, y: -8 },
                ArrowRight: { x: 8, y: 0 },
                ArrowDown: { x: 0, y: 8 },
              };
              if (!deltas[event.key]) return;
              event.preventDefault();
              update(moved(item, deltas[event.key], resize));
            }}
          >
            {!resize && <GripIcon className="size-4" />}
          </button>
        );
        return (
          <div
            key={item.id}
            role={preview ? undefined : "group"}
            aria-label={preview ? undefined : title}
            className={cn(
              "relative shrink-0 border border-transparent text-sm",
              selected && "border-blue-500",
              item.kind === "container" && "border-dashed border-slate-400",
            )}
            style={style}
            onClick={(event) => {
              if (!preview && item.id) {
                event.stopPropagation();
                choose(item.id, event.shiftKey);
              }
            }}
          >
            {item.kind === "container" ? (
              <div
                className="h-full w-full"
                style={dimensions(item.layout ?? "free", item)}
              >
                {render(item.id ?? null, item.layout ?? "free")}
              </div>
            ) : (
              <div className="flex h-full items-center overflow-hidden p-1">
                {componentPreview(item, title)}
              </div>
            )}
            {selected && !readOnly && !item.locked && (
              <>
                {layout === "free" && handle(false)}
                {handle(true)}
              </>
            )}
          </div>
        );
      });
  const panel = (
    <section
      className="min-w-0 space-y-3"
      onKeyDown={(event) => {
        if (
          readOnly ||
          preview ||
          (event.target instanceof HTMLElement &&
            ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
        )
          return;
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          undo(event.shiftKey);
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "d"
        ) {
          event.preventDefault();
          duplicate(selectionWithParts());
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "c" &&
          selection.size
        ) {
          event.preventDefault();
          clipboard.current = selectionWithParts();
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "v" &&
          clipboard.current.length
        ) {
          event.preventDefault();
          duplicate(clipboard.current);
        }
        if (event.key === "Delete" && selection.size) {
          event.preventDefault();
          remove();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <select
          className={selectStyle}
          aria-label="アートボード"
          value={board?.id ?? ""}
          onChange={(event) => {
            setBoardId(event.target.value);
            setSelection(new Set());
          }}
        >
          {!items.length && <option value="">アートボードなし</option>}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {!readOnly && (
          <>
            <select
              className={selectStyle}
              aria-label="ワイヤーフレームテンプレート"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
            >
              <option value="blank">空白</option>
              <option value="list">一覧画面</option>
              <option value="form">登録・編集</option>
              <option value="detail">詳細画面</option>
              <option value="dashboard">ダッシュボード</option>
              <option value="login">ログイン</option>
            </select>
            <Button variant="outline" size="sm" onClick={addBoard}>
              <PlusIcon />
              アートボード
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="元に戻す"
              disabled={!history.past.length}
              onClick={() => undo()}
            >
              <Undo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="やり直す"
              disabled={!history.future.length}
              onClick={() => undo(true)}
            >
              <Redo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="選択要素を複製"
              disabled={!active}
              onClick={() => duplicate(selectionWithParts())}
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!active}
              onClick={() => {
                clipboard.current = selectionWithParts();
              }}
            >
              コピー
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicate(clipboard.current)}
            >
              貼り付け
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={selection.size < 2}
              onClick={() => {
                const container = part("container");
                updateComponents([
                  ...components.map((item) =>
                    item.id && selection.has(item.id) && !item.locked
                      ? { ...item, parent_id: container.id }
                      : item,
                  ),
                  container,
                ]);
              }}
            >
              グループ化
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={selection.size < 2}
              onClick={() => {
                if (active)
                  updateComponents(
                    components.map((item) =>
                      item.id && selection.has(item.id) && !item.locked
                        ? { ...item, x: active.x }
                        : item,
                    ),
                  );
              }}
            >
              左揃え
            </Button>
            {board && !preview && (
              <WireframePartDialog
                key={board.id}
                projectId={projectId}
                canRegister={canRegisterParts}
                placement={partPlacement?.locked ? undefined : partPlacement}
                selection={() =>
                  wireframePartDefinition(
                    board,
                    wireframeSubtree(
                      components,
                      new Set(
                        selectedItems().flatMap((item) =>
                          item.id ? [item.id] : [],
                        ),
                      ),
                    ),
                  )
                }
                revision={() =>
                  partPlacement?.id
                    ? wireframePartDefinition(
                        board,
                        wireframeSubtree(
                          components,
                          new Set([partPlacement.id]),
                        ).filter((layer) => layer.id !== partPlacement.id),
                        partPlacement,
                      )
                    : null
                }
                onApply={(part, target) => {
                  const next = applyWireframePart(components, part, target);
                  if (next.components.length > 200) return false;
                  updateComponents(next.components);
                  setSelection(new Set([next.rootId]));
                  return true;
                }}
              />
            )}
          </>
        )}
        <Button
          variant={preview ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={preview}
          onClick={() => setPreview((value) => !value)}
        >
          プレビュー
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={large ? "専用編集を閉じる" : "専用編集モード"}
          onClick={() => setLarge((value) => !value)}
        >
          <MaximizeIcon />
        </Button>
        <label className="flex items-center gap-1 text-xs">
          ズーム
          <input
            type="range"
            min={0.3}
            max={1.5}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          {Math.round(zoom * 100)}%
        </label>
      </div>
      {board && (
        <div className="grid min-w-0 items-start gap-2 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_15rem]">
          <aside className="max-h-[70dvh] space-y-2 overflow-auto rounded-md border p-2">
            {!readOnly && !preview && (
              <div
                className="grid grid-cols-2 gap-1"
                aria-label="コンポーネントパレット"
              >
                {(Object.entries(componentLabels) as [Layer, string][]).map(
                  ([kind, name]) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant="outline"
                      className="h-8 px-1 text-[0.68rem]"
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData(
                          "application/x-syncnesto-wireframe-component",
                          kind,
                        )
                      }
                      onClick={() => add(kind)}
                    >
                      {name}
                    </Button>
                  ),
                )}
              </div>
            )}
            <h4 className="border-b py-1 text-sm font-semibold">レイヤー</h4>
            <ul className="space-y-1">
              {components.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full truncate rounded p-1 text-left text-xs hover:bg-muted",
                      item.id && selection.has(item.id) && "bg-primary/10",
                    )}
                    style={{ paddingInlineStart: item.parent_id ? 14 : 4 }}
                    onClick={(event) => {
                      if (item.id) choose(item.id, event.shiftKey);
                    }}
                  >
                    {item.name}
                    {item.part_pin ? ` · 版 ${item.part_pin.version}` : ""}
                    {item.locked ? " · ロック" : ""}
                    {item.hidden ? " · 非表示" : ""}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div
            tabIndex={0}
            aria-label="ワイヤーフレームキャンバス"
            className="max-h-[70dvh] min-h-80 min-w-0 overflow-auto rounded-md border bg-muted p-3"
            onDragOver={(event) => {
              if (!readOnly && !preview) event.preventDefault();
            }}
            onDrop={(event) => {
              if (readOnly || preview) return;
              event.preventDefault();
              const kind = event.dataTransfer.getData(
                "application/x-syncnesto-wireframe-component",
              ) as Layer;
              if (!Object.hasOwn(componentLabels, kind)) return;
              const area = event.currentTarget.getBoundingClientRect();
              add(kind, {
                x: Math.max(
                  0,
                  Math.round(
                    (event.clientX -
                      area.left +
                      event.currentTarget.scrollLeft -
                      12) /
                      zoom,
                  ),
                ),
                y: Math.max(
                  0,
                  Math.round(
                    (event.clientY -
                      area.top +
                      event.currentTarget.scrollTop -
                      12) /
                      zoom,
                  ),
                ),
              });
            }}
          >
            <div
              className="relative"
              style={{
                width: (board.width ?? 1024) * zoom,
                height: (board.height ?? 650) * zoom,
              }}
            >
              <div
                className="absolute origin-top-left overflow-hidden bg-white text-slate-900 shadow-sm"
                style={{
                  ...dimensions(board.layout ?? "free"),
                  width: board.width ?? 1024,
                  height: board.height ?? 650,
                  transform: `scale(${zoom})`,
                }}
              >
                {render(null, board.layout ?? "free")}
              </div>
            </div>
          </div>
          {!preview && (
            <aside className="max-h-[70dvh] space-y-2 overflow-auto rounded-md border p-2 text-xs lg:col-span-2 xl:col-span-1">
              <h4 className="text-sm font-semibold">
                {active ? "要素プロパティ" : "アートボード設定"}
              </h4>
              {active ? (
                <>
                  {partPlacement?.part_pin && (
                    <p className="rounded-md bg-muted px-2 py-1 font-medium">
                      共通部品 {partPlacement.name} · 配置版{" "}
                      {partPlacement.part_pin.version}
                    </p>
                  )}
                  <Input
                    aria-label="要素の名前"
                    value={active.name ?? ""}
                    readOnly={readOnly || active.locked}
                    onChange={(event) =>
                      update({ ...active, name: event.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        "x",
                        "y",
                        "width",
                        "height",
                        "gap",
                        "padding",
                        "columns",
                        "column_span",
                      ] as const
                    ).map((key) => (
                      <label key={key} className="space-y-1">
                        {
                          {
                            x: "X",
                            y: "Y",
                            width: "幅",
                            height: "高さ",
                            gap: "間隔",
                            padding: "余白",
                            columns: "列数",
                            column_span: "列の占有数",
                          }[key]
                        }
                        <Input
                          type="number"
                          readOnly={readOnly || active.locked}
                          value={active[key] ?? ""}
                          min={0}
                          onChange={(event) =>
                            update({
                              ...active,
                              [key]: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {active.kind === "container" && (
                    <label className="flex flex-col gap-1">
                      レイアウト
                      <select
                        className={selectStyle}
                        disabled={readOnly}
                        value={active.layout ?? "free"}
                        onChange={(event) =>
                          update({
                            ...active,
                            layout: event.target.value as Layout,
                          })
                        }
                      >
                        {Object.entries(layouts).map(([key, value]) => (
                          <option value={key} key={key}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="flex flex-col gap-1">
                    コンテナ
                    <select
                      className={selectStyle}
                      disabled={readOnly}
                      value={active.parent_id ?? ""}
                      onChange={(event) =>
                        update({
                          ...active,
                          parent_id: event.target.value || null,
                        })
                      }
                    >
                      <option value="">アートボード直下</option>
                      {components
                        .filter(
                          (item) =>
                            item.kind === "container" && item.id !== active.id,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    関連項目
                    <select
                      className={selectStyle}
                      disabled={readOnly}
                      value={active.field_id ?? ""}
                      onChange={(event) =>
                        update({
                          ...active,
                          field_id: event.target.value || null,
                        })
                      }
                    >
                      <option value="">なし</option>
                      {fields.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const item: SpecificationField = {
                          id: crypto.randomUUID(),
                          name: active.name,
                          location: "body",
                        };
                        onCreateReference(
                          "field",
                          item,
                          items.map((value) =>
                            value.id === board.id
                              ? {
                                  ...board,
                                  components: components.map((component) =>
                                    component.id === active.id
                                      ? { ...active, field_id: item.id }
                                      : component,
                                  ),
                                }
                              : value,
                          ),
                        );
                      }}
                    >
                      項目を作って関連付け
                    </Button>
                  )}
                  <label className="flex flex-col gap-1">
                    関連イベント
                    <select
                      className={selectStyle}
                      disabled={readOnly}
                      value={active.event_id ?? ""}
                      onChange={(event) =>
                        update({
                          ...active,
                          event_id: event.target.value || null,
                        })
                      }
                    >
                      <option value="">なし</option>
                      {events.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const item: ScreenEvent = {
                          id: crypto.randomUUID(),
                          name: active.name,
                          trigger: "クリック",
                        };
                        onCreateReference(
                          "event",
                          item,
                          items.map((value) =>
                            value.id === board.id
                              ? {
                                  ...board,
                                  components: components.map((component) =>
                                    component.id === active.id
                                      ? { ...active, event_id: item.id }
                                      : component,
                                  ),
                                }
                              : value,
                          ),
                        );
                      }}
                    >
                      イベントを作って関連付け
                    </Button>
                  )}
                  {active.kind === "table" && (
                    <label className="flex flex-col gap-1">
                      テーブルのサンプル（TSV）
                      <textarea
                        className="rounded border p-1"
                        readOnly={readOnly}
                        value={
                          active.table_rows
                            ?.map((row) => row.join("\t"))
                            .join("\n") ?? ""
                        }
                        onChange={(event) =>
                          update({
                            ...active,
                            table_rows: event.target.value
                              .split("\n")
                              .map((row) => row.split("\t")),
                          })
                        }
                      />
                    </label>
                  )}
                  {!readOnly && (
                    <>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={active.hidden ?? false}
                          onChange={(event) =>
                            update({ ...active, hidden: event.target.checked })
                          }
                        />
                        非表示
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={active.locked ?? false}
                          onChange={(event) =>
                            update({ ...active, locked: event.target.checked })
                          }
                        />
                        ロック
                      </label>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={active.locked}
                        onClick={() =>
                          updateComponents([
                            ...components.filter(
                              (item) => item.id !== active.id,
                            ),
                            active,
                          ])
                        }
                      >
                        前面へ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={active.locked}
                        onClick={remove}
                      >
                        削除
                      </Button>
                    </>
                  )}
                  {onReview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onReview(
                          `content/artboards/${board.id}/components/${active.id}/name`,
                        )
                      }
                    >
                      要素に指摘
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Input
                    aria-label="アートボード名"
                    readOnly={readOnly}
                    value={board.name ?? ""}
                    onChange={(event) =>
                      updateBoard({ ...board, name: event.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {(["width", "height"] as const).map((key) => (
                      <label key={key}>
                        {key === "width" ? "幅" : "高さ"}
                        <Input
                          type="number"
                          min={240}
                          max={3840}
                          readOnly={readOnly}
                          value={board[key] ?? 650}
                          onChange={(event) =>
                            updateBoard({
                              ...board,
                              [key]: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <select
                    className={selectStyle}
                    aria-label="アートボードのレイアウト"
                    disabled={readOnly}
                    value={board.layout ?? "free"}
                    onChange={(event) =>
                      updateBoard({
                        ...board,
                        layout: event.target.value as Layout,
                      })
                    }
                  >
                    {Object.entries(layouts).map(([key, value]) => (
                      <option value={key} key={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    className={selectStyle}
                    aria-label="アートボードの状態"
                    disabled={readOnly}
                    value={board.state_id ?? ""}
                    onChange={(event) =>
                      updateBoard({
                        ...board,
                        state_id: event.target.value || null,
                      })
                    }
                  >
                    <option value="">共通状態</option>
                    {states.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        save(items.filter((item) => item.id !== board.id));
                        setBoardId(undefined);
                      }}
                    >
                      アートボードを削除
                    </Button>
                  )}
                </>
              )}
            </aside>
          )}
        </div>
      )}
    </section>
  );
  return large ? (
    <div
      role="dialog"
      aria-label="ワイヤーフレーム専用編集"
      className="fixed inset-0 z-50 overflow-auto bg-background p-4"
    >
      {panel}
    </div>
  ) : (
    panel
  );
}
