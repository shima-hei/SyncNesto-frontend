export const areChangeLogValuesEqual = (left: unknown, right: unknown) => {
  return normalizeChangeLogValue(left) === normalizeChangeLogValue(right);
};

const normalizeChangeLogValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(normalizeChangeLogValue).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  if ("label" in record && "code" in record) {
    return normalizeChangeLogValue(record.code);
  }

  if ("label" in record && "key" in record) {
    return normalizeChangeLogValue(record.key);
  }

  if ("label" in record && "id" in record) {
    return normalizeChangeLogValue(record.id);
  }

  return stableStringify(record);
};

const stableStringify = (value: Record<string, unknown>) => {
  const sortedEntries = Object.keys(value)
    .sort()
    .map((key) => [key, normalizeChangeLogValue(value[key])]);

  return JSON.stringify(sortedEntries);
};
