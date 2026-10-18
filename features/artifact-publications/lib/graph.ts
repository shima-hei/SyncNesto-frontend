import type {
  PublicationNodeRead,
  TestDesignUpdate,
} from "@/lib/api/generated/model";

export type PublicTestDesignGraph = TestDesignUpdate;

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
] as const;
const keys = new Set([
  "name",
  "description",
  "version",
  "layout",
  ...collections,
]);

export async function decodePublicationGraph(
  root: PublicationNodeRead,
  nodes: PublicationNodeRead[],
): Promise<PublicTestDesignGraph> {
  const invalid = () => {
    throw new Error(
      "公開準備版のテスト設計を検証できません。最初から取得してください。",
    );
  };
  const schema = "public-test-design-v1";
  if (
    root.node_kind !== "test_design" ||
    root.payload.graph_schema !== schema ||
    !Number.isSafeInteger(root.payload.part_count) ||
    Number(root.payload.part_count) < 1
  )
    invalid();
  const parts = nodes.filter((n) => n.parent_id === root.id);
  if (parts.length !== root.payload.part_count) invalid();
  let text = "";
  for (const [index, part] of parts.entries()) {
    if (
      part.node_kind !== "test_design_part" ||
      part.ordinal !== root.ordinal + index + 1 ||
      part.position !== index ||
      part.source_version !== root.source_version ||
      part.payload.graph_schema !== schema ||
      part.payload.index !== index ||
      typeof part.payload.text !== "string"
    )
      invalid();
    text += part.payload.text;
  }
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const hex = Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (hex !== root.payload.graph_digest) invalid();
  const graph = JSON.parse(text);
  if (
    !graph ||
    typeof graph !== "object" ||
    Object.keys(graph).some((k) => !keys.has(k)) ||
    Object.keys(graph).length !== keys.size ||
    graph.version !== root.source_version ||
    typeof graph.name !== "string" ||
    typeof graph.description !== "string" ||
    !graph.layout
  )
    invalid();
  const counts = root.payload.counts as Record<string, number> | undefined;
  if (
    !counts ||
    collections.some(
      (k) => !Array.isArray(graph[k]) || graph[k].length !== counts[k],
    )
  )
    invalid();
  return graph;
}
