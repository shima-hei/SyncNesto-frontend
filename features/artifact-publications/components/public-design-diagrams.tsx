"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicationNodeRead } from "@/lib/api/generated/model";

type Kind = "screen" | "database";
type Point = { x: number; y: number };
type PublishedDesign = {
  id: string;
  ordinal: number;
  name: string;
  version?: number | null;
  subtitle: string;
  links: unknown[];
};

const titles = { screen: "画面遷移図", database: "ER図" } as const;
const linkLabel = {
  transition: "画面遷移",
  foreign_key: "外部キー",
  logical: "論理リレーション",
} as const;
const nodeWidth = 204;
const nodeHeight = 92;
const maxColumns = 3;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function publishedDesigns(nodes: PublicationNodeRead[], kind: Kind) {
  return nodes.flatMap((node): PublishedDesign[] => {
    if (
      node.node_kind !== "specification" ||
      node.payload.kind !== kind ||
      node.payload.status !== "approved"
    )
      return [];
    const content = record(node.payload.content);
    const identifier = content?.[kind === "screen" ? "route" : "physical_name"];
    return [
      {
        id: node.id,
        ordinal: node.ordinal,
        name: String(node.payload.title ?? ""),
        subtitle: typeof identifier === "string" ? identifier : "",
        version: node.source_version,
        links: Array.isArray(node.payload.diagram_links)
          ? node.payload.diagram_links
          : [],
      },
    ];
  });
}

function edgePath(from: Point, to: Point) {
  if (from === to) {
    const x = from.x + nodeWidth;
    const y = from.y + nodeHeight / 2;
    return `M ${x} ${y} C ${x + 54} ${y - 16} ${x + 54} ${y - 54} ${x} ${y - 24}`;
  }
  if (from.x === to.x) {
    const direction = Math.sign(to.y - from.y);
    const x = from.x + nodeWidth / 2;
    const start = from.y + (direction > 0 ? nodeHeight : 0);
    const end = to.y + (direction > 0 ? 0 : nodeHeight);
    const bend = Math.min(48, Math.abs(start - end) / 2) * direction;
    return `M ${x} ${start} C ${x + 20} ${start + bend} ${x + 20} ${end - bend} ${x} ${end}`;
  }
  const direction = Math.sign(to.x - from.x);
  const x1 = from.x + (direction > 0 ? nodeWidth : 0);
  const x2 = to.x + (direction > 0 ? 0 : nodeWidth);
  const y1 = from.y + nodeHeight / 2 - 7 * direction;
  const y2 = to.y + nodeHeight / 2 - 7 * direction;
  const bend = Math.min(90, Math.abs(x2 - x1) / 2) * direction;
  return `M ${x1} ${y1} C ${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`;
}

export function PublicDesignDiagrams({
  nodes,
}: {
  nodes: PublicationNodeRead[];
}) {
  const markerId = useId();
  const screens = publishedDesigns(nodes, "screen");
  const tables = publishedDesigns(nodes, "database");
  const [choice, setChoice] = useState<Kind>("screen");
  const [logical, setLogical] = useState(false);
  if (!screens.length && !tables.length) return null;
  const available: Kind[] = [
    ...(screens.length ? (["screen"] as const) : []),
    ...(tables.length ? (["database"] as const) : []),
  ];
  const kind = available.includes(choice) ? choice : available[0];
  const designs = kind === "screen" ? screens : tables;
  const byOrder = new Map(designs.map((node) => [node.ordinal, node]));
  const positions = new Map<number, Point>(
    designs.map((node, index) => [
      node.ordinal,
      {
        x: 24 + (index % maxColumns) * 284,
        y: 24 + Math.floor(index / maxColumns) * 158,
      },
    ]),
  );
  const relation =
    kind === "screen" ? "transition" : logical ? "logical" : "foreign_key";
  const links = designs.flatMap((source) =>
    source.links.flatMap((entry, index) => {
      const link = record(entry);
      if (link?.kind !== relation || typeof link.target_ordinal !== "number")
        return [];
      const target = byOrder.get(link.target_ordinal);
      if (!target) return [];
      return [
        {
          id: `${source.id}-${index}`,
          source,
          target,
          name: typeof link.name === "string" ? link.name : "",
          detail: typeof link.detail === "string" ? link.detail : "",
        },
      ];
    }),
  );
  const width = 100 + Math.min(designs.length, maxColumns) * 284;
  const height = 158 * Math.ceil(designs.length / maxColumns);
  return (
    <section
      className="space-y-3 rounded-lg border p-3"
      aria-label="公開固定版の設計図"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{titles[kind]}</h3>
        <div className="flex flex-wrap gap-1">
          {available.length > 1 &&
            available.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={kind === item ? "secondary" : "ghost"}
                aria-pressed={kind === item}
                onClick={() => setChoice(item)}
              >
                {titles[item]}
              </Button>
            ))}
          {kind === "database" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={logical}
              onClick={() => setLogical(!logical)}
            >
              論理ERを表示
            </Button>
          )}
        </div>
      </div>
      <div
        className="max-h-[60dvh] overflow-auto rounded-md bg-muted/50"
        tabIndex={0}
        aria-label={titles[kind] + "のキャンバス"}
      >
        <div className="relative" style={{ width, height }}>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 text-primary"
            width={width}
            height={height}
          >
            <defs>
              <marker
                id={markerId}
                markerWidth={8}
                markerHeight={8}
                refX={7}
                refY={4}
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
              </marker>
            </defs>
            {links.map((link) => (
              <path
                key={link.id}
                d={edgePath(
                  positions.get(link.source.ordinal)!,
                  positions.get(link.target.ordinal)!,
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray={relation === "logical" ? "6 4" : undefined}
                markerEnd={`url(#${markerId})`}
              />
            ))}
          </svg>
          {designs.map((node) => (
            <a
              href={`#public-node-${node.id}`}
              key={node.id}
              className="absolute flex min-w-0 flex-col justify-center gap-1 rounded-md border bg-background px-3 text-sm hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                left: positions.get(node.ordinal)?.x,
                top: positions.get(node.ordinal)?.y,
                width: nodeWidth,
                height: nodeHeight,
              }}
            >
              <span className="line-clamp-2 font-medium">{node.name}</span>
              {node.subtitle && (
                <span className="truncate text-xs text-muted-foreground">
                  {node.subtitle}
                </span>
              )}
              {node.version && (
                <span className="text-xs text-muted-foreground">
                  元の版 {node.version}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
      {links.length > 0 && (
        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            {linkLabel[relation]} {links.length}件
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {links.map((link) => (
              <li key={link.id}>
                {link.source.name} → {link.target.name}
                {link.name && ` · ${link.name}`}
                {link.detail && `（${link.detail}）`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
