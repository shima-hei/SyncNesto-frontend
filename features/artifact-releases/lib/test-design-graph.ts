import type {
  ArtifactNodeRead,
  TestDesignRead,
} from "@/lib/api/generated/model";

const schema = "test-design-graph-v1";
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

export async function decodeTestDesign(
  root: ArtifactNodeRead,
  nodes: ArtifactNodeRead[],
  projectId: number,
): Promise<TestDesignRead> {
  const invalid = () => {
    throw new Error(
      "固定したテスト設計の構成を検証できません。最初から再取得してください。",
    );
  };
  if (
    root.node_kind !== "test_design" ||
    root.payload.graph_schema !== schema ||
    !Number.isSafeInteger(root.payload.part_count) ||
    Number(root.payload.part_count) < 1
  )
    invalid();
  const parts = nodes.filter((node) => node.parent_id === root.id);
  if (parts.length !== root.payload.part_count) invalid();
  let text = "";
  for (const [index, part] of parts.entries()) {
    if (
      part.node_kind !== "test_design_part" ||
      part.release_id !== root.release_id ||
      part.source_id !== root.source_id ||
      part.source_version !== root.source_version ||
      part.position !== index ||
      part.ordinal !== root.ordinal + index + 1 ||
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
  const hex = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hex !== root.payload.graph_digest) invalid();
  const graph = JSON.parse(text);
  const graphCounts = root.payload.counts as
    Record<string, unknown> | undefined;
  if (
    !graph ||
    graph.id !== root.source_id ||
    graph.project_id !== projectId ||
    graph.version !== root.source_version ||
    typeof graph.name !== "string" ||
    !graph.layout ||
    typeof graph.layout.cells !== "object" ||
    typeof graph.layout.widths !== "object" ||
    typeof graph.layout.heights !== "object"
  )
    invalid();
  for (const key of collections) {
    if (!Array.isArray(graph[key]) || graph[key].length !== graphCounts?.[key])
      invalid();
    const ids = new Set<string>();
    for (const entry of graph[key]) {
      if (!entry || typeof entry.id !== "string" || ids.has(entry.id))
        invalid();
      ids.add(entry.id);
    }
  }
  return graph as TestDesignRead;
}
