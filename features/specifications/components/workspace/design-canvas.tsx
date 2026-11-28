"use client";

import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ArrowRightIcon,
  GripIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  DesignEdge,
  DesignNode,
  PlacementInput,
} from "@/lib/api/generated/model";
import { specificationCode, specificationHref } from "../../lib/specification";

type Position = { x: number; y: number };
type DiagramNode = Pick<
  DesignNode,
  | "id"
  | "kind"
  | "title"
  | "identifier"
  | "version"
  | "placement"
  | "field_labels"
>;
const nodeWidth = 212;
const nodeHeight = 88;
const step = 12;

function defaultPosition(index: number): Position {
  return { x: 36 + (index % 3) * 294, y: 40 + Math.floor(index / 3) * 194 };
}

export function DesignCanvas({
  projectId,
  nodes,
  edges,
  selected,
  onSelect,
  onEdge,
  onConnect,
  onPlace,
  onAdd,
  canEdit,
  busy,
  referenceIds,
  logical,
  historical = false,
}: {
  projectId: number;
  nodes: DiagramNode[];
  edges: DesignEdge[];
  selected: Set<number>;
  onSelect: (id: number, multiple: boolean) => void;
  onEdge: (edge: DesignEdge) => void;
  onConnect?: (sourceId: number, targetId?: number) => void;
  onPlace: (positions: PlacementInput[]) => void;
  onAdd?: (position?: Position) => void;
  canEdit: boolean;
  busy: boolean;
  referenceIds: Set<number>;
  logical: boolean;
  historical?: boolean;
}) {
  const markerId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    positions: Map<number, Position>;
    pointer: number;
  } | null>(null);
  const pan = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const connectionDrag = useRef<{
    pointer: number;
    sourceId: number;
    x: number;
    y: number;
  } | null>(null);
  const [connection, setConnection] = useState<
    (Position & { sourceId: number; targetId?: number }) | null
  >(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<
    (Position & { ids: Map<number, Position> }) | null
  >(null);
  const positions = new Map(
    nodes.map((node, index) => [
      node.id,
      node.placement ?? defaultPosition(index),
    ]),
  );
  const detailHref = (node: DiagramNode) => {
    const href = specificationHref(projectId, node.id);
    return historical ? `${href}?tab=history&version=${node.version}` : href;
  };
  const selectedNode =
    selected.size === 1 && nodes.find((node) => selected.has(node.id));
  const point = (id: number): Position => {
    const start = positions.get(id) ?? defaultPosition(0);
    return offset?.ids.has(id)
      ? {
          x: Math.max(0, start.x + offset.x),
          y: Math.max(0, start.y + offset.y),
        }
      : start;
  };
  const width = Math.max(
    780,
    ...nodes.map((node) => point(node.id).x + nodeWidth + 44),
  );
  const height = Math.max(
    520,
    ...nodes.map((node) => point(node.id).y + nodeHeight + 88),
  );
  const save = (entries: Iterable<[number, Position]>) => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const values = Array.from(entries, ([specification_id, position]) => ({
      ...position,
      specification_id,
      version: byId.get(specification_id)?.placement?.version ?? 0,
    }));
    if (values.length) onPlace(values);
  };
  function start(event: PointerEvent<HTMLButtonElement>, node: DiagramNode) {
    if (event.button !== 0 || busy || !canEdit || referenceIds.has(node.id))
      return;
    event.stopPropagation();
    const ids = selected.has(node.id) ? selected : new Set([node.id]);
    if (!selected.has(node.id)) onSelect(node.id, false);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      positions: new Map(
        Array.from(ids)
          .filter((id) => !referenceIds.has(id) && positions.has(id))
          .map((id) => [id, positions.get(id)!]),
      ),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    setOffset({
      x: Math.round((event.clientX - current.x) / zoom),
      y: Math.round((event.clientY - current.y) / zoom),
      ids: current.positions,
    });
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    const x = Math.round((event.clientX - current.x) / zoom / step) * step;
    const y = Math.round((event.clientY - current.y) / zoom / step) * step;
    if (x || y)
      save(
        Array.from(current.positions, ([id, start]) => [
          id,
          { x: Math.max(0, start.x + x), y: Math.max(0, start.y + y) },
        ]),
      );
    drag.current = null;
    setOffset(null);
  }
  function keyMove(event: KeyboardEvent<HTMLButtonElement>, node: DiagramNode) {
    const movement: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = movement[event.key];
    if (!delta || busy) return;
    event.preventDefault();
    const previous = point(node.id);
    save([
      [
        node.id,
        {
          x: Math.max(0, previous.x + delta.x),
          y: Math.max(0, previous.y + delta.y),
        },
      ],
    ]);
  }
  function connectionTarget(clientX: number, clientY: number) {
    const node = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-screen-node-id]");
    return node && stage.current?.contains(node)
      ? Number(node.dataset.screenNodeId)
      : undefined;
  }
  function clearConnection() {
    connectionDrag.current = null;
    setConnection(null);
  }
  function updateConnection(event: PointerEvent<HTMLButtonElement>) {
    const drag = connectionDrag.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!drag || drag.pointer !== event.pointerId || !rect) return;
    setConnection({
      sourceId: drag.sourceId,
      targetId: connectionTarget(event.clientX, event.clientY),
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    });
  }
  function finishConnection(event: PointerEvent<HTMLButtonElement>) {
    const drag = connectionDrag.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    clearConnection();
    if (Math.hypot(drag.x - event.clientX, drag.y - event.clientY) < 8) {
      onConnect?.(drag.sourceId);
      return;
    }
    const target = connectionTarget(event.clientX, event.clientY);
    if (target !== undefined) onConnect?.(drag.sourceId, target);
  }
  const fit = () => {
    const area = viewport.current;
    if (!area) return;
    setZoom(
      Math.max(
        0.2,
        Math.min(
          1,
          (area.clientWidth - 16) / width,
          (area.clientHeight - 16) / height,
        ),
      ),
    );
    area.scrollTo(0, 0);
  };
  const visible = new Set(nodes.map((node) => node.id));
  const connections = edges.filter(
    (edge) => visible.has(edge.source_id) && visible.has(edge.target_id),
  );
  const parallelEdges = new Map<string, DesignEdge[]>();
  for (const edge of connections) {
    const key = `${edge.source_id}:${edge.target_id}`;
    const group = parallelEdges.get(key) ?? [];
    group.push(edge);
    parallelEdges.set(key, group);
  }
  return (
    <div className="relative min-w-0 overflow-hidden bg-muted/25">
      <div
        ref={viewport}
        className="h-[min(64dvh,46rem)] min-h-80 overflow-auto overscroll-contain"
        aria-label="設計図キャンバス"
        tabIndex={0}
      >
        <div
          className="relative"
          style={{ width: width * zoom, height: height * zoom }}
        >
          <div
            ref={stage}
            className="absolute origin-top-left touch-none bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px]"
            style={{ width, height, transform: `scale(${zoom})` }}
            onPointerDown={(event) => {
              const area = viewport.current;
              if (
                !area ||
                event.target !== event.currentTarget ||
                event.button !== 0
              )
                return;
              pan.current = {
                x: event.clientX,
                y: event.clientY,
                left: area.scrollLeft,
                top: area.scrollTop,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!pan.current) return;
              viewport.current?.scrollTo(
                pan.current.left + pan.current.x - event.clientX,
                pan.current.top + pan.current.y - event.clientY,
              );
            }}
            onLostPointerCapture={() => {
              pan.current = null;
            }}
            onDoubleClick={(event) => {
              if (!canEdit || event.target !== event.currentTarget) return;
              const rect = event.currentTarget.getBoundingClientRect();
              onAdd?.({
                x: Math.round((event.clientX - rect.left) / zoom),
                y: Math.round((event.clientY - rect.top) / zoom),
              });
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0 text-muted-foreground"
              width={width}
              height={height}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={markerId}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
                </marker>
              </defs>
              {[...parallelEdges.values()].flatMap((parallel) =>
                parallel.map((edge, index) => {
                  const from = point(edge.source_id);
                  const to = point(edge.target_id);
                  const related =
                    selected.has(edge.source_id) ||
                    selected.has(edge.target_id);
                  const curve = (index - (parallel.length - 1) / 2) * 18;
                  const forward = to.x >= from.x;
                  const sourceX = from.x + (forward ? nodeWidth : 0);
                  const sourceY = from.y + 36;
                  const targetX = to.x + (forward ? 0 : nodeWidth);
                  const targetY = to.y + 36;
                  const direction = forward ? 1 : -1;
                  const d =
                    edge.source_id === edge.target_id
                      ? `M ${sourceX} ${sourceY} C ${sourceX + 112 + curve} ${sourceY - 110}, ${targetX - 112 - curve} ${targetY - 110}, ${targetX} ${targetY}`
                      : `M ${sourceX} ${sourceY} C ${sourceX + 64 * direction} ${sourceY + curve}, ${targetX - 64 * direction} ${targetY + curve}, ${targetX} ${targetY}`;
                  return (
                    <path
                      key={edge.id}
                      d={d}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={related ? 2.5 : 1.4}
                      className={cn(related && "text-primary")}
                      strokeDasharray={
                        edge.kind === "logical" ? "5 4" : undefined
                      }
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                }),
              )}
              {connection && (
                <line
                  x1={point(connection.sourceId).x + nodeWidth}
                  y1={point(connection.sourceId).y + 36}
                  x2={connection.x}
                  y2={connection.y}
                  className="text-primary"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  markerEnd={`url(#${markerId})`}
                />
              )}
            </svg>
            {nodes.map((node) => {
              const position = point(node.id);
              const reference = referenceIds.has(node.id);
              const title =
                node.kind === "database" && !logical
                  ? node.identifier || node.title
                  : node.title;
              return (
                <div
                  key={node.id}
                  data-screen-node-id={
                    node.kind === "screen" ? node.id : undefined
                  }
                  className={cn(
                    "absolute rounded-md border bg-background shadow-xs",
                    selected.has(node.id) &&
                      "border-primary ring-2 ring-primary/20",
                    connection?.targetId === node.id &&
                      "border-primary ring-2 ring-primary",
                    reference && "border-dashed",
                  )}
                  style={{
                    left: position.x,
                    top: position.y,
                    width: nodeWidth,
                  }}
                >
                  <div className="flex min-h-16 items-start gap-1">
                    {canEdit && !reference && (
                      <button
                        type="button"
                        className="m-1 cursor-grab touch-none select-none rounded p-2 text-muted-foreground hover:bg-muted focus-visible:outline-ring [-webkit-user-select:none]"
                        aria-label={`${title}を移動（矢印キーでも操作）`}
                        disabled={busy}
                        onPointerDown={(event) => start(event, node)}
                        onPointerMove={move}
                        onPointerUp={finish}
                        onLostPointerCapture={() => {
                          drag.current = null;
                          setOffset(null);
                        }}
                        onKeyDown={(event) => keyMove(event, node)}
                      >
                        <GripIcon className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-pressed={selected.has(node.id)}
                      className="flex min-w-0 flex-1 flex-col gap-1 rounded p-2 text-left focus-visible:outline-ring"
                      onClick={(event) => onSelect(node.id, event.shiftKey)}
                      onDoubleClick={() => {
                        window.location.assign(detailHref(node));
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {specificationCode(node)}
                        {historical && ` · 版 ${node.version}`}
                        {reference && " · 参照"}
                      </span>
                      <span
                        className="w-full truncate text-sm font-medium"
                        title={title}
                      >
                        {title}
                      </span>
                    </button>
                  </div>
                  {onConnect &&
                    canEdit &&
                    node.kind === "screen" &&
                    !reference && (
                      <button
                        type="button"
                        aria-label={`${title}から遷移先を接続`}
                        className="absolute top-9 -right-3 z-10 grid size-7 -translate-y-1/2 cursor-crosshair touch-none place-items-center rounded-full border border-primary bg-background text-primary shadow-xs select-none focus-visible:ring-2 focus-visible:ring-primary [-webkit-user-select:none]"
                        disabled={busy}
                        onPointerDown={(event) => {
                          if (event.button !== 0 || connectionDrag.current)
                            return;
                          event.stopPropagation();
                          connectionDrag.current = {
                            pointer: event.pointerId,
                            sourceId: node.id,
                            x: event.clientX,
                            y: event.clientY,
                          };
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                        }}
                        onPointerMove={updateConnection}
                        onPointerUp={finishConnection}
                        onLostPointerCapture={clearConnection}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") clearConnection();
                        }}
                        onClick={(event) => {
                          if (event.detail === 0) onConnect(node.id);
                        }}
                      >
                        <ArrowRightIcon className="size-4" />
                      </button>
                    )}
                  {!!node.field_labels?.length && (
                    <ul className="border-t px-2 py-1 font-mono text-xs">
                      {node.field_labels.slice(0, 3).map((field, index) => (
                        <li key={index} className="truncate">
                          {field}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {!nodes.length && canEdit && (
              <Button
                className="absolute top-12 left-10"
                onClick={() => onAdd?.()}
              >
                <PlusIcon /> 最初の設計を追加
              </Button>
            )}
          </div>
        </div>
      </div>
      {nodes.length > 1 && (
        <button
          type="button"
          onClick={fit}
          aria-label="ミニマップから全体を表示"
          className="absolute right-3 bottom-14 hidden h-16 w-26 overflow-hidden rounded border bg-background/90 shadow-sm sm:block"
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
          >
            {nodes.map((node) => {
              const position = point(node.id);
              return (
                <rect
                  key={node.id}
                  x={position.x}
                  y={position.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  className={
                    selected.has(node.id)
                      ? "fill-primary"
                      : "fill-muted-foreground/45"
                  }
                  rx={10}
                />
              );
            })}
          </svg>
        </button>
      )}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="縮小"
            onClick={() => setZoom((value) => Math.max(0.2, value - 0.1))}
          >
            <MinusIcon />
          </Button>
          <span className="min-w-11 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="拡大"
            onClick={() => setZoom((value) => Math.min(1.8, value + 0.1))}
          >
            <PlusIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={fit}>
            <MaximizeIcon /> 全体表示
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !nodes.length}
              onClick={() =>
                save(
                  nodes
                    .filter((node) => !referenceIds.has(node.id))
                    .map((node, index) => [node.id, defaultPosition(index)]),
                )
              }
            >
              自動整列
            </Button>
          )}
        </div>
        <div
          className="flex min-w-0 items-center gap-1 overflow-x-auto"
          aria-label="接続線を選択"
        >
          {connections
            .filter(
              (edge) =>
                selected.has(edge.source_id) || selected.has(edge.target_id),
            )
            .map((edge) => (
              <Button
                key={edge.id}
                size="sm"
                variant="outline"
                onClick={() => onEdge(edge)}
              >
                {edge.name || (edge.kind === "transition" ? "遷移" : "関連")}
              </Button>
            ))}
          {selectedNode && (
            <Button asChild size="sm" variant="ghost">
              <Link href={detailHref(selectedNode)}>設計を開く</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
