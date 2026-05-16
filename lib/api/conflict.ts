import { ApiError } from "./error";
import type { ApiConflictErrorResponse } from "./types";

export const VERSION_CONFLICT_CODE = "VERSION_CONFLICT" as const;

export type VersionedResource = {
  version: number;
};

export type ConflictField = {
  key: string;
  originalValue: unknown;
  localValue: unknown;
  currentValue: unknown;
};

export type ConflictFieldOptions<T extends Record<string, unknown>> = {
  original: T;
  local: T;
  current: Partial<T>;
  keys?: readonly (keyof T & string)[];
};

export type ConflictRetryPayload<TLocal, TCurrent extends VersionedResource> =
  TLocal & {
    version: TCurrent["version"];
  };

export const isVersionConflictError = <TCurrent = unknown>(
  error: unknown
): error is ApiError & {
  status: 409;
  code: typeof VERSION_CONFLICT_CODE;
  data: ApiConflictErrorResponse<TCurrent>;
} => {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === VERSION_CONFLICT_CODE &&
    isConflictErrorResponse<TCurrent>(error.data)
  );
};

export const getConflictCurrent = <TCurrent>(error: unknown) => {
  if (!isVersionConflictError<TCurrent>(error)) {
    return null;
  }

  return error.data.current;
};

export const createConflictRetryPayload = <
  TLocal,
  TCurrent extends VersionedResource,
>(
  local: TLocal,
  current: TCurrent
): ConflictRetryPayload<TLocal, TCurrent> => {
  return {
    ...local,
    // ローカル編集を再送信する場合は、409で返された最新versionを使う。
    version: current.version,
  };
};

export const getConflictFields = <T extends Record<string, unknown>>({
  original,
  local,
  current,
  keys,
}: ConflictFieldOptions<T>) => {
  const targetKeys = keys ?? getComparableKeys(original, local, current);

  return targetKeys.reduce<ConflictField[]>((fields, key) => {
    const originalValue = original[key];
    const localValue = local[key];
    const currentValue = current[key];
    const localChanged = !isSameValue(localValue, originalValue);
    const currentChanged = !isSameValue(currentValue, originalValue);
    const valuesConflict = !isSameValue(localValue, currentValue);

    // ユーザーとサーバーの両方が変更した項目だけを競合解決の対象にする。
    if (localChanged && currentChanged && valuesConflict) {
      fields.push({
        key,
        originalValue,
        localValue,
        currentValue,
      });
    }

    return fields;
  }, []);
};

const isConflictErrorResponse = <TCurrent>(
  data: unknown
): data is ApiConflictErrorResponse<TCurrent> => {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string" &&
    "code" in data &&
    data.code === VERSION_CONFLICT_CODE &&
    "current" in data
  );
};

const getComparableKeys = <T extends Record<string, unknown>>(
  original: T,
  local: T,
  current: Partial<T>
) => {
  return Array.from(
    new Set([
      ...Object.keys(original),
      ...Object.keys(local),
      ...Object.keys(current),
    ])
  ) as (keyof T & string)[];
};

const isSameValue = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) {
    return true;
  }

  return JSON.stringify(left) === JSON.stringify(right);
};
