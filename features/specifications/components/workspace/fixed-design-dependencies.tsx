"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DesignEdge, SpecificationRead } from "@/lib/api/generated/model";
import {
  specificationCode,
  specificationHref,
  type Content,
} from "../../lib/specification";
import { DesignCanvas } from "./design-canvas";

type FixedPlacement = { view: string; x: number; y: number; hidden: boolean };
type Dependency = Pick<
  SpecificationRead,
  "id" | "kind" | "title" | "version"
> & {
  identifier: string;
  placements: FixedPlacement[];
};

export type DesignSnapshot = SpecificationRead & {
  content: Content;
  dependencies?: Dependency[];
  placements?: FixedPlacement[];
  groups?: { id: string; name: string }[];
};

function fixedEdges({ id, content }: DesignSnapshot): DesignEdge[] {
  const edge = (
    item: { id?: string; target_id: number; name?: string },
    kind: DesignEdge["kind"],
    condition?: string,
  ): DesignEdge[] =>
    item.id
      ? [
          {
            id: item.id,
            source_id: id,
            target_id: item.target_id,
            name: item.name ?? "",
            kind,
            condition,
          },
        ]
      : [];
  if (content.type === "screen")
    return (content.transitions ?? []).flatMap((item) =>
      edge(item, "transition", item.condition),
    );
  if (content.type === "database")
    return [
      ...(content.constraints ?? []).flatMap((item) =>
        item.kind === "foreign_key" && item.target_id
          ? edge({ ...item, target_id: item.target_id }, "foreign_key")
          : [],
      ),
      ...(content.relationships ?? []).flatMap((item) =>
        edge(item, "logical", item.cardinality ?? undefined),
      ),
    ];
  return [];
}

export function FixedDesignDependencies({
  projectId,
  snapshot,
}: {
  projectId: number;
  snapshot: DesignSnapshot;
}) {
  const id = useId();
  const [view, setView] = useState("all");
  const [logical, setLogical] = useState(false);
  const [selected, setSelected] = useState(new Set([snapshot.id]));
  const [activeEdge, setActiveEdge] = useState<DesignEdge>();
  if (!snapshot.dependencies) return null;
  const edges = fixedEdges(snapshot);
  const { content } = snapshot;
  const root: Dependency = {
    id: snapshot.id,
    kind: snapshot.kind,
    title: snapshot.title,
    version: snapshot.version,
    identifier:
      content.type === "database"
        ? (content.physical_name ?? "")
        : content.type === "screen"
          ? (content.route ?? "")
          : (content.path ?? ""),
    placements: snapshot.placements ?? [],
  };
  const connectedIds = new Set(edges.map((item) => item.target_id));
  const nodes = [
    root,
    ...snapshot.dependencies.filter((item) => connectedIds.has(item.id)),
  ].flatMap((item) => {
    const placement = item.placements.find((value) => value.view === view);
    return placement?.hidden
      ? []
      : [
          {
            ...item,
            placement: placement && { ...placement, specification_id: item.id },
          },
        ];
  });
  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">参照先の固定版</h3>
        {snapshot.dependencies.length ? (
          <ul className="flex flex-wrap gap-2">
            {snapshot.dependencies.map((item) => (
              <li key={item.id}>
                <Link
                  className="inline-flex max-w-full flex-wrap gap-x-2 rounded-md border px-2 py-1 text-sm hover:underline"
                  href={`${specificationHref(projectId, item.id)}?tab=history&version=${item.version}`}
                >
                  <span className="font-mono text-xs leading-5 text-muted-foreground">
                    {specificationCode(item)}
                  </span>
                  <span className="[overflow-wrap:anywhere]">{item.title}</span>
                  <span className="text-muted-foreground">
                    版 {item.version}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            参照する設計はありません。
          </p>
        )}
      </div>
      {snapshot.kind !== "api" && (
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">
              {snapshot.kind === "screen" ? "固定版の遷移図" : "固定版のER図"}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {!!snapshot.groups?.length && (
                <label
                  className="flex flex-wrap items-center gap-2 text-sm"
                  htmlFor={id}
                >
                  配置ビュー
                  <select
                    id={id}
                    value={view}
                    onChange={(event) => {
                      setView(event.target.value);
                      setActiveEdge(undefined);
                    }}
                    className="h-8 max-w-full rounded-md border bg-background px-2"
                  >
                    <option value="all">全体</option>
                    {snapshot.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {snapshot.kind === "database" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={logical}
                  onClick={() => {
                    setLogical(!logical);
                    setActiveEdge(undefined);
                  }}
                >
                  論理ERを表示
                </Button>
              )}
            </div>
          </div>
          {!!nodes.length && (
            <DesignCanvas
              projectId={projectId}
              nodes={nodes}
              edges={edges.filter(
                (item) => (item.kind === "logical") === logical,
              )}
              selected={selected}
              referenceIds={new Set()}
              onSelect={(nodeId) => {
                setSelected(new Set([nodeId]));
                setActiveEdge(undefined);
              }}
              onEdge={setActiveEdge}
              onPlace={() => undefined}
              canEdit={false}
              busy={false}
              logical={logical}
              historical
            />
          )}
          {activeEdge?.condition && (
            <p className="text-sm text-muted-foreground">
              {activeEdge.condition}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
