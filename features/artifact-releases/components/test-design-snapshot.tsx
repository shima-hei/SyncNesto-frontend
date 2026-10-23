"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DesignGrid } from "@/features/test-designs/components/tables/design-grid";
import { PatternMatrix } from "@/features/test-designs/components/tables/pattern-matrix";
import { gridData } from "@/features/test-designs/lib/sheets";
import { tableDesign } from "@/features/test-designs/lib/pattern-tables";
import type {
  ArtifactNodeRead,
  TestDesignRead,
} from "@/lib/api/generated/model";
import { decodeTestDesign } from "../lib/test-design-graph";

const noop = () => undefined;
const counts = new Map<string, number>();

export function TestDesignSnapshot({
  root,
  nodes,
  projectId,
  complete,
}: {
  root: ArtifactNodeRead;
  nodes: ArtifactNodeRead[];
  projectId: number;
  complete: boolean;
}) {
  const query = useQuery({
    queryKey: [
      "artifact-test-graph",
      projectId,
      root.release_id,
      root.id,
      root.payload.graph_digest,
    ],
    queryFn: () => decodeTestDesign(root, nodes, projectId),
    enabled: complete,
    retry: false,
    gcTime: 0,
  });
  if (!complete || query.isPending)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">テスト設計の全データを取得・検証しています…</p>
        <Skeleton className="h-24" />
      </div>
    );
  if (query.error)
    return (
      <DataLoadError
        resourceName="固定したテスト設計の構成"
        onRetry={() => void query.refetch()}
      />
    );
  return <FrozenDesign key={root.id} design={query.data} />;
}

function FrozenDesign({ design }: { design: TestDesignRead }) {
  const [search, setSearch] = useState("");
  const tables = design.pattern_tables ?? [];
  const [table, setTable] = useState(tables[0]?.id ?? "legacy");
  const selected = useMemo(
    () => (table === "legacy" ? design : tableDesign(design, table)),
    [design, table],
  );
  const grid = useMemo(() => gridData(design, "items"), [design]);
  const rows = useMemo(
    () =>
      search
        ? grid.rows.filter((row) =>
            Object.values(row.values).some((value) =>
              String(value)
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
            ),
          )
        : grid.rows,
    [grid.rows, search],
  );
  const legacy =
    !tables.length ||
    design.patterns.some((pattern) => !pattern.table_id) ||
    design.factors.some((factor) => !factor.table_id);
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="固定したテスト設計"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{design.name}</h3>
        <Badge variant="secondary">
          固定版・v{design.version}・読み取り専用
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{design.description}</p>
      <p className="text-xs text-muted-foreground">
        項目 {design.items.filter((item) => !item.is_spacer).length}件 / 因子{" "}
        {design.factors.length}件 / 水準 {design.levels.length}件 / 組み合わせ{" "}
        {design.patterns.length}件。実行結果・コメントは含みません。
      </p>
      <Tabs defaultValue="items" className="min-w-0">
        <TabsList>
          <TabsTrigger value="items">テスト項目</TabsTrigger>
          <TabsTrigger value="matrix">因子・水準と組み合わせ</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="flex min-w-0 flex-col gap-3">
          <Input
            aria-label="固定したテスト項目を検索"
            placeholder="項目内を検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <DesignGrid
            sheet="items"
            {...grid}
            rows={rows}
            layout={design.layout}
            readOnly
            viewOnly
            onEdit={noop}
            onLayout={noop}
            onAdd={noop}
            onDelete={noop}
            onUndo={noop}
            onRedo={noop}
          />
        </TabsContent>
        <TabsContent value="matrix" className="min-w-0">
          <Tabs value={table} onValueChange={setTable} className="min-w-0">
            <div className="max-w-full overflow-x-auto">
              <TabsList aria-label="固定したパターン表">
                {tables.map((entry) => (
                  <TabsTrigger key={entry.id} value={entry.id}>
                    {entry.name}
                  </TabsTrigger>
                ))}
                {legacy ? (
                  <TabsTrigger value="legacy">旧形式の組み合わせ</TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <p className="my-3 text-xs text-muted-foreground">
              ○ 水準 / ● 期待値。無効な組み合わせも当時の状態で保持しています。
            </p>
            <PatternMatrix
              key={table}
              design={selected}
              change={noop}
              readOnly
              viewOnly
              onUndo={noop}
              onRedo={noop}
              counts={counts}
            />
            <details className="mt-3 text-sm">
              <summary>組み合わせの説明・有効状態・備考</summary>
              <dl className="mt-2 flex flex-col gap-3">
                {selected.patterns.map((pattern) => (
                  <div key={pattern.id}>
                    <dt>
                      {pattern.code} ·{" "}
                      {pattern.enabled === false ? "無効" : "有効"}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words text-muted-foreground">
                      {pattern.description || "説明なし"}
                      {"\n"}
                      {pattern.notes}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            <details className="mt-3 text-sm">
              <summary>テスト項目との対応</summary>
              <ul className="mt-2">
                {selected.items
                  .filter((item) => !item.is_spacer)
                  .map((item) => (
                    <li key={item.id}>
                      {item.code} · {item.content}
                      {item.pattern_table_id
                        ? " · このパターン表を使用"
                        : ` · ${design.links
                            .filter((link) => link.item_id === item.id)
                            .map(
                              (link) =>
                                design.patterns.find(
                                  (pattern) => pattern.id === link.pattern_id,
                                )?.code,
                            )
                            .join("、")}`}
                    </li>
                  ))}
              </ul>
            </details>
          </Tabs>
        </TabsContent>
      </Tabs>
    </section>
  );
}
