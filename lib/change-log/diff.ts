import { areChangeLogValuesEqual } from "./compare";

export type ChangeLogDiffRow = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

type GetChangeLogDiffRowsOptions = {
  oldValue: unknown;
  newValue: unknown;
  formatField: (fieldName: string) => string;
  formatValue: (value: unknown, fieldName?: string | null) => string;
  ignoredFields?: string[];
};

export const getChangeLogUpdatedFields = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.updated_fields)) {
    return [];
  }

  return value.updated_fields.filter(
    (updatedField): updatedField is string => typeof updatedField === "string"
  );
};

export const getChangeLogDiffRows = ({
  oldValue,
  newValue,
  formatField,
  formatValue,
  ignoredFields = [],
}: GetChangeLogDiffRowsOptions): ChangeLogDiffRow[] => {
  const oldRecord = getComparableRecord(oldValue);
  const newRecord = getComparableRecord(newValue);

  if (!oldRecord || !newRecord) {
    return [];
  }

  const ignoredFieldSet = new Set(ignoredFields);
  const updatedFields = getChangeLogUpdatedFields(newValue);
  const targetFields = updatedFields.length
    ? updatedFields
    : Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));

  return targetFields
    .filter((field) => !ignoredFieldSet.has(field))
    .filter((field) => field in oldRecord || field in newRecord)
    .map((field) => ({
      field,
      label: formatField(field),
      oldValue: formatValue(oldRecord[field], field),
      newValue: formatValue(newRecord[field], field),
    }))
    .filter((row) => row.oldValue !== row.newValue);
};

export const getMissingChangeLogFieldLabels = (
  oldValue: unknown,
  newValue: unknown,
  formatField: (fieldName: string) => string
) => {
  const oldRecord = getComparableRecord(oldValue);
  const newRecord = getComparableRecord(newValue);

  if (!oldRecord || !newRecord) {
    return [];
  }

  return getChangeLogUpdatedFields(newValue)
    .filter((field) => !(field in oldRecord) && !(field in newRecord))
    .map(formatField);
};

export const hasVisibleChangeLogDiff = (
  oldValue: unknown,
  newValue: unknown
) => {
  return !areChangeLogValuesEqual(oldValue, newValue);
};

const getComparableRecord = (value: unknown) => {
  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.snapshot)) {
    return value.snapshot;
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
