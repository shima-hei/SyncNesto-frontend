export type JsonObject = Record<string, unknown>;

export const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export const asString = (value: unknown) =>
  typeof value === "string" ? value : "";

export const propertyOrderKey = "x-syncnesto-property-order";
const identityKey = "x-syncnesto-id";
const branches = ["allOf", "anyOf", "oneOf", "prefixItems"] as const;

export function orderedProperties(schema: JsonObject) {
  const properties = asObject(schema.properties);
  const saved = schema[propertyOrderKey];
  const names = Array.isArray(saved)
    ? saved.filter(
        (key): key is string =>
          typeof key === "string" && Object.hasOwn(properties, key),
      )
    : [];
  return [...new Set([...names, ...Object.keys(properties)])];
}

export function duplicateSchema(schema: unknown): unknown {
  if (typeof schema === "boolean") return schema;
  const copied = {
    ...asObject(schema),
    [identityKey]: crypto.randomUUID(),
  } as JsonObject;
  if (copied.properties !== undefined)
    copied.properties = Object.fromEntries(
      Object.entries(asObject(copied.properties)).map(([name, child]) => [
        name,
        duplicateSchema(child),
      ]),
    );
  for (const key of [
    "items",
    "additionalProperties",
    "not",
    "if",
    "then",
    "else",
  ]) {
    if (copied[key] !== undefined) copied[key] = duplicateSchema(copied[key]);
  }
  for (const key of branches) {
    if (Array.isArray(copied[key]))
      copied[key] = copied[key].map(duplicateSchema);
  }
  return copied;
}

const bound = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const length = (value: unknown, fallback: number, maximum: number) =>
  Math.max(0, Math.min(maximum, Math.trunc(bound(value, fallback))));

export function sampleFromSchema(schema: unknown): unknown {
  let remaining = 400;
  function example(definition: unknown, depth: number): unknown {
    if (depth > 12 || --remaining < 0 || definition === false) return null;
    const value = asObject(definition);
    for (const key of ["const", "example", "default"])
      if (Object.hasOwn(value, key)) return value[key];
    if (Array.isArray(value.examples) && value.examples.length)
      return value.examples[0];
    if (Array.isArray(value.enum) && value.enum.length) return value.enum[0];
    if (value.$ref) return null;
    const type = Array.isArray(value.type)
      ? (value.type.find((kind) => kind !== "null") ?? "null")
      : value.type;
    if (type === "object" || value.properties)
      return Object.fromEntries(
        orderedProperties(value)
          .slice(0, 80)
          .map((name) => [
            name,
            example(asObject(value.properties)[name], depth + 1),
          ]),
      );
    if (type === "array" || value.items) {
      const limit = length(value.maxItems, 30, 30);
      const count = length(value.minItems, 1, limit);
      return Array.from({ length: count }, () =>
        example(value.items, depth + 1),
      );
    }
    if (type === "integer" || type === "number") {
      const min = bound(value.minimum, -Infinity);
      const max = bound(value.maximum, Infinity);
      const lower =
        typeof value.exclusiveMinimum === "number"
          ? value.exclusiveMinimum + (type === "integer" ? 1 : 0.01)
          : min;
      const upper =
        typeof value.exclusiveMaximum === "number"
          ? value.exclusiveMaximum - (type === "integer" ? 1 : 0.01)
          : max;
      const candidate = Math.min(Math.min(max, upper), Math.max(0, min, lower));
      return type === "integer" ? Math.trunc(candidate) : candidate;
    }
    if (type === "boolean") return false;
    if (type === "null") return null;
    return "x".repeat(
      length(value.minLength, 6, length(value.maxLength, 200, 200)),
    );
  }
  return example(schema, 0);
}
