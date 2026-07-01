import { createDraftStorageKey } from "./draft-key";

const DEFAULT_DRAFT_TTL_DAYS = 30;

export type StoredDraft<TValues> = {
  schemaVersion: number;
  values: TValues;
  updatedAt: string;
  expiresAt: string;
};

export const readStoredDraft = <TValues>(
  userId: number | null | undefined,
  scope: string,
  schemaVersion = 1
) => {
  if (!userId || typeof window === "undefined") {
    return null;
  }
  const key = createDraftStorageKey(userId, scope);
  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    const draft = JSON.parse(rawValue) as StoredDraft<TValues>;

    if (
      draft.schemaVersion !== schemaVersion ||
      new Date(draft.expiresAt).getTime() <= Date.now()
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const writeStoredDraft = <TValues>(
  userId: number | null | undefined,
  scope: string,
  values: TValues,
  schemaVersion = 1
) => {
  if (!userId || typeof window === "undefined") {
    return;
  }
  const now = new Date();
  const expiresAt = new Date(now);

  expiresAt.setDate(expiresAt.getDate() + DEFAULT_DRAFT_TTL_DAYS);
  window.localStorage.setItem(
    createDraftStorageKey(userId, scope),
    JSON.stringify({
      schemaVersion,
      values,
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies StoredDraft<TValues>)
  );
};

export const removeStoredDraft = (
  userId: number | null | undefined,
  scope: string
) => {
  if (!userId || typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(createDraftStorageKey(userId, scope));
};
