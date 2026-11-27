import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./wireframe-parts.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const { applyWireframePart, wireframePartDefinition } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("parts keep independent placements and keep local links after a revision", () => {
  const original = {
    part_id: "part",
    name: "共通部品",
    version: 1,
    content: {
      width: 400,
      height: 100,
      layers: [
        { id: "container", kind: "container" },
        { id: "input", parent_id: "container", kind: "input", name: "変更前" },
      ],
    },
  };
  const first = applyWireframePart([], original);
  const other = applyWireframePart([], original);
  assert.notEqual(first.rootId, other.rootId);
  assert.notEqual(first.components[2].id, other.components[2].id);
  first.components[2].field_id = "local-field";
  first.components[2].event_id = "local-event";
  const next = {
    ...original,
    version: 2,
    content: {
      ...original.content,
      layers: [{ id: "input", kind: "input", name: "変更後" }],
    },
  };
  const updated = applyWireframePart(
    first.components,
    next,
    first.components[0],
  );
  assert.equal(updated.rootId, first.rootId);
  assert.equal(updated.components.length, 2);
  assert.equal(updated.components[0].part_pin.version, 2);
  assert.equal(updated.components[1].id, first.components[2].id);
  assert.equal(updated.components[1].parent_id, first.rootId);
  assert.equal(updated.components[1].field_id, "local-field");
  assert.equal(updated.components[1].event_id, "local-event");
  assert.equal(other.components[0].part_pin.version, 1);
  assert.equal(other.components[2].name, "変更前");
});

test("publishing edits retains stable origins and does not duplicate a new local layer", () => {
  const original = {
    part_id: "part",
    name: "ヘッダー",
    version: 1,
    content: {
      width: 320,
      height: 80,
      layers: [{ id: "search", kind: "input" }],
    },
  };
  const { components, rootId } = applyWireframePart([], original);
  const root = components[0];
  const added = {
    id: "added",
    parent_id: rootId,
    kind: "button",
    event_id: "event",
  };
  components.push(added);
  const content = wireframePartDefinition(
    { components },
    components.slice(1),
    root,
  );
  assert.deepEqual(
    content.layers.map((layer) => layer.id),
    ["search", "added"],
  );
  assert.equal(content.layers[1].event_id, undefined);
  const updated = applyWireframePart(
    components,
    { ...original, version: 2, content },
    root,
  );
  assert.equal(updated.components.length, 3);
  assert.equal(updated.components[2].id, added.id);
  assert.equal(updated.components[2].event_id, "event");
});
