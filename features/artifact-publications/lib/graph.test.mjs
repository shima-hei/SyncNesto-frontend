import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { decodePublicationGraph } from "./graph.ts";

function fixture() {
  const data = {
    name: "公開するテスト🧪",
    description: "入力値と期待結果",
    version: 3,
    layout: { cells: {}, widths: {}, heights: {} },
  };
  const collections = [
    "pattern_tables",
    "items",
    "factors",
    "levels",
    "patterns",
    "values",
    "links",
    "columns",
    "expected_values",
    "expected_selections",
  ];
  for (const key of collections) data[key] = [];
  data.items.push({
    id: "stable-item",
    code: "T001",
    content: "入力→確認",
    custom_values: { custom_note: "人が確認する内容" },
  });
  data.factors.push({ id: "factor", name: "入力" });
  data.levels.push({ id: "level", factor_id: "factor", name: "日本語" });
  data.patterns.push({
    id: "pattern",
    code: "P001",
    enabled: false,
    notes: "無効な列も残す",
  });
  data.values.push({
    id: "value",
    pattern_id: "pattern",
    factor_id: "factor",
    level_id: "level",
  });
  const text = JSON.stringify(data);
  const root = {
    id: "root",
    node_kind: "test_design",
    ordinal: 0,
    source_version: 3,
    payload: {
      graph_schema: "public-test-design-v1",
      part_count: 2,
      counts: Object.fromEntries(collections.map((k) => [k, data[k].length])),
      graph_digest: createHash("sha256").update(text).digest("hex"),
    },
  };
  const parts = [text.slice(0, 33), text.slice(33)].map((text, index) => ({
    id: `part${index}`,
    parent_id: "root",
    ordinal: index + 1,
    position: index,
    node_kind: "test_design_part",
    source_version: 3,
    payload: { graph_schema: "public-test-design-v1", index, text },
  }));
  return { data, root, nodes: [root, ...parts] };
}

test("内部IDなしの分割本文を、値・参照UUID・無効列を保って復元する", async () => {
  const f = fixture();
  assert.deepEqual(await decodePublicationGraph(f.root, f.nodes), f.data);
});

test("別表現・欠落・重複・順序・親・元版・内容hash・件数の不整合を拒否する", async () => {
  for (const mutate of [
    (f) => (f.root.payload.graph_schema = "test-design-graph-v1"),
    (f) => f.nodes.pop(),
    (f) => f.nodes.push(f.nodes[1]),
    (f) => ([f.nodes[1], f.nodes[2]] = [f.nodes[2], f.nodes[1]]),
    (f) => (f.nodes[1].parent_id = "other"),
    (f) => (f.nodes[1].source_version = 2),
    (f) => (f.nodes[1].payload.text += "x"),
    (f) => (f.root.payload.counts.items = 0),
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(decodePublicationGraph(f.root, f.nodes));
  }
});

test("hashが一致していても内部envelopeや未知の本文キーを含むgraphを拒否する", async () => {
  for (const extra of [
    { project_id: 1 },
    { id: 1 },
    { updated_at: "2026-10-18" },
    { internal_notes: "除外する管理情報" },
  ]) {
    const f = fixture();
    const text = JSON.stringify({ ...f.data, ...extra });
    f.root.payload.part_count = 1;
    f.root.payload.graph_digest = createHash("sha256")
      .update(text)
      .digest("hex");
    f.nodes = [
      f.root,
      { ...f.nodes[1], payload: { ...f.nodes[1].payload, text } },
    ];
    await assert.rejects(decodePublicationGraph(f.root, f.nodes));
  }
});
