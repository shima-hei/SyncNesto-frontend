import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { decodeTestDesign } from "./test-design-graph.ts";

function fixture() {
  const graph = {
    id: 7,
    project_id: 3,
    version: 2,
    name: "日本語と🧪",
    layout: { cells: {}, widths: {}, heights: {} },
  };
  const keys = [
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
  for (const key of keys) graph[key] = [];
  const text = JSON.stringify(graph);
  const root = {
    id: "root",
    release_id: "release",
    source_id: 7,
    source_version: 2,
    ordinal: 0,
    node_kind: "test_design",
    payload: {
      graph_schema: "test-design-graph-v1",
      part_count: 2,
      counts: Object.fromEntries(keys.map((key) => [key, 0])),
      graph_digest: createHash("sha256").update(text).digest("hex"),
    },
  };
  const parts = [text.slice(0, 30), text.slice(30)].map((text, index) => ({
    id: `part${index}`,
    release_id: "release",
    parent_id: "root",
    source_id: 7,
    source_version: 2,
    ordinal: index + 1,
    position: index,
    node_kind: "test_design_part",
    payload: { graph_schema: "test-design-graph-v1", index, text },
  }));
  return { graph, root, nodes: [root, ...parts] };
}

test("JSONの途中で分割した日本語graphをUUIDや内容を変えず復元", async () => {
  const { graph, root, nodes } = fixture();
  assert.deepEqual(await decodeTestDesign(root, nodes, 3), graph);
});

test("欠落・重複・順序・別root・別release・hash・件数・Projectの不整合を拒否", async () => {
  for (const mutate of [
    (f) => f.nodes.pop(),
    (f) => f.nodes.push(f.nodes[1]),
    (f) => ([f.nodes[1], f.nodes[2]] = [f.nodes[2], f.nodes[1]]),
    (f) => (f.nodes[1].parent_id = "other"),
    (f) => (f.nodes[1].release_id = "other"),
    (f) => (f.nodes[1].payload.text += "x"),
    (f) => (f.root.payload.counts.items = 5),
    (f) => (f.root.source_id = 8),
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(decodeTestDesign(f.root, f.nodes, 3));
  }
  const f = fixture();
  await assert.rejects(decodeTestDesign(f.root, f.nodes, 4));
});
