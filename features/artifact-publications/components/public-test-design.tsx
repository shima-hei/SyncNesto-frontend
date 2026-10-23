"use client";

import { useMemo, useState } from "react";
import { DesignGrid } from "@/features/test-designs/components/tables/design-grid";
import { gridData } from "@/features/test-designs/lib/sheets";
import { matrixRows } from "@/features/test-designs/lib/matrix";
import { tableDesign } from "@/features/test-designs/lib/pattern-tables";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicTestDesignGraph } from "../lib/graph";

const noop = () => undefined;

export function PublicTestDesign({
  design,
}: {
  design: PublicTestDesignGraph;
}) {
  const [search, setSearch] = useState("");
  const [table, setTable] = useState(
    design.pattern_tables?.[0]?.id ?? "legacy",
  );
  const grid = useMemo(() => gridData(design, "items"), [design]);
  const selected = useMemo(
    () => (table === "legacy" ? design : tableDesign(design, table)),
    [design, table],
  );
  const rows = useMemo(
    () =>
      !search
        ? grid.rows
        : grid.rows.filter((r) =>
            Object.values(r.values).some((v) =>
              String(v)
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
            ),
          ),
    [search, grid.rows],
  );
  const matrix = useMemo(() => matrixRows(selected), [selected]);
  const legacy =
    !design.pattern_tables?.length ||
    design.patterns.some((p) => !p.table_id) ||
    design.factors.some((f) => !f.table_id);
  const handlers = {
    onEdit: noop,
    onLayout: noop,
    onAdd: noop,
    onDelete: noop,
    onUndo: noop,
    onRedo: noop,
  };
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="公開するテスト設計"
    >
      <h3 className="text-base font-semibold">
        {design.name}・元の版 {design.version}
      </h3>
      <p className="whitespace-pre-wrap break-words text-sm">
        {design.description}
      </p>
      <p className="text-xs text-muted-foreground">
        項目 {design.items.filter((i) => !i.is_spacer).length}件 / 因子{" "}
        {design.factors.length}件 / 水準 {design.levels.length}件 / 組み合わせ{" "}
        {design.patterns.length}件。実行結果・コメントは含みません。
      </p>
      <Tabs defaultValue="items" className="min-w-0">
        <TabsList>
          <TabsTrigger value="items">テスト項目</TabsTrigger>
          <TabsTrigger value="matrix">因子・水準とマトリクス</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="flex min-w-0 flex-col gap-3">
          <Input
            aria-label="公開するテスト項目を検索"
            placeholder="この固定内容の項目を検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            検索で隠れた行も公開本文に含みます。任意列・入力値・備考も確認してください。
          </p>
          <DesignGrid
            sheet="items"
            {...grid}
            rows={rows}
            layout={design.layout}
            readOnly
            viewOnly
            {...handlers}
          />
        </TabsContent>
        <TabsContent value="matrix" className="min-w-0">
          <Tabs value={table} onValueChange={setTable} className="min-w-0">
            <div className="max-w-full overflow-x-auto">
              <TabsList aria-label="公開するパターン表">
                {design.pattern_tables?.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.name}
                  </TabsTrigger>
                ))}
                {legacy ? (
                  <TabsTrigger value="legacy">旧形式の組み合わせ</TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <p className="my-3 text-xs text-muted-foreground">
              ○ 水準 / ●
              期待値。無効な組み合わせ・説明・備考も固定内容に含みます。
            </p>
            <DesignGrid
              key={table}
              sheet="matrix"
              rows={matrix}
              columns={[
                { key: "factor", label: "因子" },
                { key: "level", label: "水準 / 期待値" },
                ...selected.patterns.map((p) => ({
                  key: p.id,
                  label: `${p.code}${p.enabled === false ? "（無効）" : ""}`,
                })),
              ]}
              layout={selected.layout}
              readOnly
              viewOnly
              {...handlers}
            />
          </Tabs>
        </TabsContent>
      </Tabs>
      {design.links.length ? (
        <details className="text-sm">
          <summary>旧形式のテスト項目と組み合わせの対応</summary>
          <ul className="flex flex-col gap-1">
            {design.links.map((l) => (
              <li key={l.id}>
                {design.items.find((i) => i.id === l.item_id)?.code} →{" "}
                {design.patterns.find((p) => p.id === l.pattern_id)?.code}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
