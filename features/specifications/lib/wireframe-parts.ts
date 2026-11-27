import type {
  WireframeArtboard,
  WireframeComponent,
  WireframePartContent,
  WireframePartRead,
} from "@/lib/api/generated/model";

export function wireframeSubtree(
  components: WireframeComponent[],
  roots: ReadonlySet<string>,
) {
  const children = new Map<string, string[]>();
  for (const { id, parent_id } of components) {
    if (id && parent_id) {
      const siblings = children.get(parent_id) ?? [];
      siblings.push(id);
      children.set(parent_id, siblings);
    }
  }
  const pending = [...roots];
  const included = new Set<string>();
  for (const id of pending) {
    if (included.has(id)) continue;
    included.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return components.filter(({ id }) => id && included.has(id));
}

export function enclosingPart(
  components: WireframeComponent[],
  active?: WireframeComponent,
) {
  const byId = new Map(components.map((layer) => [layer.id, layer]));
  const seen = new Set<string>();
  while (active?.id && !seen.has(active.id)) {
    if (active.part_pin) return active;
    seen.add(active.id);
    active = byId.get(active.parent_id ?? undefined);
  }
}

export function wireframePartDefinition(
  board: WireframeArtboard,
  selected: WireframeComponent[],
  root?: WireframeComponent,
): WireframePartContent | null {
  if (!selected.length || selected.length >= 200) return null;
  const originIds = new Map(
    Object.entries(root?.part_pin?.layer_ids ?? {}).map(([id, local]) => [
      local,
      id,
    ]),
  );
  const ids = new Map(
    selected.map((layer) => [
      layer.id,
      originIds.get(layer.id ?? "") ?? layer.id,
    ]),
  );
  const top = selected.filter(
    (layer) => !ids.has(layer.parent_id ?? undefined),
  );
  const sameParent = top.every(
    (layer) => layer.parent_id === top[0]?.parent_id,
  );
  const parent = top[0]?.parent_id
    ? board.components?.find(({ id }) => id === top[0]?.parent_id)
    : board;
  const layout =
    root?.layout ?? (sameParent ? parent?.layout : "free") ?? "free";
  const offsetX =
    root || layout !== "free" ? 0 : Math.min(...top.map(({ x }) => x ?? 0));
  const offsetY =
    root || layout !== "free" ? 0 : Math.min(...top.map(({ y }) => y ?? 0));
  const gap = root?.gap ?? 8;
  const padding = root?.padding ?? 8;
  const width = Math.max(...top.map((layer) => layer.width ?? 160));
  const height = Math.max(...top.map((layer) => layer.height ?? 40));
  return {
    width:
      root?.width ??
      Math.min(
        10000,
        layout === "free"
          ? Math.max(
              ...top.map(
                (layer) => (layer.x ?? 0) - offsetX + (layer.width ?? 160),
              ),
            ) + 2
          : layout === "horizontal"
            ? top.reduce((sum, layer) => sum + (layer.width ?? 160), 0) +
              (top.length - 1) * gap +
              padding * 2 +
              2
            : layout === "grid"
              ? (parent?.width ?? width * 2)
              : width + padding * 2 + 2,
      ),
    height:
      root?.height ??
      Math.min(
        10000,
        layout === "free"
          ? Math.max(
              ...top.map(
                (layer) => (layer.y ?? 0) - offsetY + (layer.height ?? 40),
              ),
            ) + 2
          : layout === "horizontal"
            ? height + padding * 2 + 2
            : top.reduce((sum, layer) => sum + (layer.height ?? 40), 0) +
              (top.length - 1) * gap +
              padding * 2 +
              2,
      ),
    layout,
    gap,
    padding,
    columns:
      root?.columns ??
      (parent && "columns" in parent ? parent.columns : undefined) ??
      2,
    layers: selected.map((entry) => {
      const layer = { ...entry };
      delete layer.field_id;
      delete layer.event_id;
      delete layer.part_pin;
      const parentId = ids.get(entry.parent_id ?? undefined);
      return {
        ...layer,
        id: ids.get(entry.id),
        parent_id: parentId ?? null,
        x: (layer.x ?? 0) - (parentId ? 0 : offsetX),
        y: (layer.y ?? 0) - (parentId ? 0 : offsetY),
      };
    }),
  };
}

export function applyWireframePart(
  components: WireframeComponent[],
  part: WireframePartRead,
  placement?: WireframeComponent,
) {
  const rootId = placement?.id ?? crypto.randomUUID();
  const instance = wireframeSubtree(components, new Set([rootId]));
  const previous = new Map(instance.map((layer) => [layer.id, layer]));
  const oldIds = placement?.part_pin?.layer_ids ?? {};
  const { layers, ...layout } = part.content;
  const identifiedLayers = layers.map((layer) => ({
    ...layer,
    id: layer.id ?? crypto.randomUUID(),
  }));
  const ids = Object.fromEntries(
    identifiedLayers.map(({ id }) => {
      const oldId = oldIds[id] ?? id;
      return [id, previous.has(oldId) ? oldId : crypto.randomUUID()];
    }),
  );
  const newLayers = identifiedLayers.map((layer): WireframeComponent => {
    const id = ids[layer.id];
    const prior = previous.get(id);
    return {
      ...layer,
      id,
      parent_id: (layer.parent_id && ids[layer.parent_id]) || rootId,
      field_id: prior?.field_id,
      event_id: prior?.event_id,
    };
  });
  const retained = new Set(Object.values(ids));
  const replaced = new Set(
    [...Object.values(oldIds), ...retained].filter((id) => previous.has(id)),
  );
  const root: WireframeComponent = {
    x: 16,
    y: 22,
    ...placement,
    ...layout,
    id: rootId,
    name: part.name,
    kind: "container",
    part_pin: { part_id: part.part_id, version: part.version, layer_ids: ids },
  };
  const next = components.flatMap((layer) => {
    if (layer.id === rootId) return [root, ...newLayers];
    if (layer.id && replaced.has(layer.id)) return [];
    if (
      layer.parent_id &&
      replaced.has(layer.parent_id) &&
      !retained.has(layer.parent_id)
    ) {
      return [{ ...layer, parent_id: rootId }];
    }
    return [layer];
  });
  if (!placement) next.push(root, ...newLayers);
  return { rootId, components: next };
}
