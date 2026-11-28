"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CollectionRead, DesignNode } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import { specificationCode, type Kind } from "../../lib/specification";

const rowHeight = 32;
const padding = 6;
const methodColors: Record<string, string> = {
  GET: "text-blue-700 dark:text-blue-300",
  HEAD: "text-blue-700 dark:text-blue-300",
  POST: "text-emerald-700 dark:text-emerald-300",
  PUT: "text-amber-700 dark:text-amber-300",
  PATCH: "text-violet-700 dark:text-violet-300",
  DELETE: "text-red-700 dark:text-red-300",
  TRACE: "text-muted-foreground",
  OPTIONS: "text-muted-foreground",
};
type ListRow =
  { key: string; label: string } | { key: string; node: DesignNode };

export function DesignNodeList({
  nodes,
  selected,
  onSelect,
  sort,
  groups,
  kind,
}: {
  nodes: DesignNode[];
  selected: Set<number>;
  onSelect: (id: number) => void;
  sort: string;
  groups: CollectionRead[];
  kind: Kind;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const [first, setFirst] = useState(0);
  const [capacity, setCapacity] = useState(15);
  const [focus, setFocus] = useState<string>();
  const rows = useMemo(() => {
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));
    const grouped = new Map<string, DesignNode[]>();
    for (const node of nodes) {
      const keys =
        kind !== "api"
          ? [""]
          : sort === "tag"
            ? node.tags?.length
              ? node.tags
              : ["タグなし"]
            : sort === "group"
              ? node.group_ids?.length
                ? node.group_ids.map((id) => groupNames.get(id) ?? "未分類")
                : ["未分類"]
              : [
                  node.identifier?.split("/").slice(0, 2).join("/") ||
                    "パス未確定",
                ];
      for (const label of new Set(keys)) {
        const group = grouped.get(label) ?? [];
        group.push(node);
        grouped.set(label, group);
      }
    }
    return [...grouped]
      .sort(([a], [b]) => a.localeCompare(b, "ja"))
      .flatMap(([label, entries]): ListRow[] => [
        ...(label ? [{ key: `heading:${label}`, label }] : []),
        ...entries.map((node) => ({ key: `node:${label}:${node.id}`, node })),
      ]);
  }, [groups, kind, nodes, sort]);
  const itemIndices = rows.flatMap((row, index) =>
    "node" in row ? [index] : [],
  );
  const focused = rows.findIndex((row) => row.key === focus);
  const chosen = rows.findIndex(
    (row) => "node" in row && selected.has(row.node.id),
  );
  const primary =
    focused >= 0 ? focused : chosen >= 0 ? chosen : itemIndices[0];
  const virtual = rows.length > 40;
  const start = virtual
    ? Math.min(
        Math.max(0, rows.length - capacity),
        Math.max(0, first - padding),
      )
    : 0;
  const end = virtual
    ? Math.min(rows.length, start + capacity + 2 * padding)
    : rows.length;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setCapacity(Math.max(1, Math.ceil(element.clientHeight / rowHeight))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pending.current === null) return;
    const button = viewport.current?.querySelector<HTMLButtonElement>(
      `[data-node-index="${pending.current}"]`,
    );
    if (button) {
      pending.current = null;
      button.focus({ preventScroll: true });
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const current = itemIndices.indexOf(index);
    let target: number | undefined;
    switch (event.key) {
      case "ArrowUp":
        target = itemIndices[current - 1];
        break;
      case "ArrowDown":
        target = itemIndices[current + 1];
        break;
      case "Home":
        target = itemIndices[0];
        break;
      case "End":
        target = itemIndices.at(-1);
        break;
      default:
        return;
    }
    if (target === undefined || target === index) return;
    event.preventDefault();
    pending.current = target;
    setFocus(rows[target].key);
  }

  return (
    <div
      ref={viewport}
      className="max-h-[40dvh] overflow-auto"
      role="region"
      aria-label={kind === "api" ? "APIエンドポイント一覧" : "図の設計一覧"}
      onScroll={(event) =>
        setFirst(Math.floor(event.currentTarget.scrollTop / rowHeight))
      }
    >
      <div className="relative" style={{ height: rows.length * rowHeight }}>
        {rows.map((row, index) => {
          if (index !== primary && (index < start || index >= end)) return null;
          const position = { top: index * rowHeight, height: rowHeight };
          if (!("node" in row))
            return (
              <p
                key={row.key}
                style={position}
                className="absolute inset-x-0 truncate px-1 pt-2 text-xs font-medium text-muted-foreground"
                title={row.label}
              >
                {row.label}
              </p>
            );
          const { node } = row;
          const method =
            kind === "api" ? node.subtype || "API" : specificationCode(node);
          return (
            <button
              type="button"
              key={row.key}
              data-node-index={index}
              tabIndex={index === primary ? 0 : -1}
              aria-pressed={selected.has(node.id)}
              style={position}
              onClick={() => onSelect(node.id)}
              onFocus={() => setFocus(row.key)}
              onKeyDown={(event) => navigate(event, index)}
              className={cn(
                "absolute inset-x-0 flex min-w-0 items-center gap-1.5 rounded px-1 text-left text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                selected.has(node.id) && "bg-primary/10 text-primary",
              )}
            >
              <span
                className={cn(
                  "shrink-0 font-mono text-[0.65rem] font-semibold",
                  kind === "api" && methodColors[method],
                )}
              >
                {method}
              </span>
              <span className="min-w-0 truncate" title={node.title}>
                {node.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
