import type { ApiSpecification } from "@/lib/api/generated/model";

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

export const schemaTypes = [
  "string",
  "integer",
  "number",
  "boolean",
  "object",
  "array",
  "null",
] as const;

export function initializeOperation(content: ApiSpecification): JsonObject {
  const legacyType = (dataType?: string) =>
    schemaTypes.some((type) => type === dataType) ? dataType : "string";
  const schema = (fields: typeof content.request_fields) => ({
    type: "object",
    properties: Object.fromEntries(
      (fields ?? [])
        .filter((field) => field.name)
        .map((field) => [
          field.name!,
          {
            type: legacyType(field.data_type),
            description: field.description,
            "x-syncnesto-id": field.id,
          },
        ]),
    ),
    required: (fields ?? [])
      .filter((field) => field.required && field.name)
      .map((field) => field.name),
  });
  const request =
    content.request_fields?.filter((field) => field.location === "body") ?? [];
  const parameters = (content.request_fields ?? [])
    .filter(
      (field) =>
        field.name &&
        ["path", "query", "header", "cookie"].includes(field.location ?? ""),
    )
    .map((field) => ({
      name: field.name,
      in: field.location,
      required: Boolean(field.required || field.location === "path"),
      description: field.description,
      schema: { type: legacyType(field.data_type) },
      "x-syncnesto-id": field.id,
    }));
  const registered = new Set(
    parameters.filter((item) => item.in === "path").map((item) => item.name),
  );
  for (const match of (content.path ?? "").matchAll(/\{([^{}]+)\}/g)) {
    if (!registered.has(match[1])) {
      registered.add(match[1]);
      parameters.push({
        name: match[1],
        in: "path",
        required: true,
        description: "",
        schema: { type: "string" },
        "x-syncnesto-id": crypto.randomUUID(),
      });
    }
  }
  const initialResponses = Object.fromEntries(
    (content.responses ?? [])
      .filter((item) => /^(?:[1-5](?:\d{2}|XX)|default)$/.test(item.name ?? ""))
      .map((item) => [
        item.name!,
        {
          description: item.description || item.destination || item.name,
          "x-syncnesto-id": item.id,
        },
      ]),
  );
  if (!Object.keys(initialResponses).length)
    initialResponses["200"] = {
      description: "正常応答",
      "x-syncnesto-id": crypto.randomUUID(),
    };
  if (content.response_fields?.length) {
    const success =
      Object.keys(initialResponses).find((value) => value.startsWith("2")) ??
      "200";
    Object.assign(initialResponses, {
      [success]: {
        ...initialResponses[success],
        description: initialResponses[success]?.description ?? "正常応答",
        content: {
          "application/json": {
            schema: schema(content.response_fields),
          },
        },
      },
    });
  }
  return {
    parameters,
    responses: initialResponses,
    ...(request.length
      ? {
          requestBody: {
            content: {
              "application/json": { schema: schema(request) },
            },
          },
        }
      : {}),
  };
}
