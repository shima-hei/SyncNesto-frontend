import { createDraftStorageKey } from "./draft-key";
import {
  isDemoUser,
  isActiveDemoUser,
  readDemoDraft,
  writeDemoDraft,
  removeDemoDraft,
} from "@/lib/demo/session";

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
  schemaVersion = 1,
) => {
  if (!userId || typeof window === "undefined") {
    return null;
  }
  const key = createDraftStorageKey(userId, scope);
  if (isDemoUser(userId))
    return isActiveDemoUser(userId)
      ? readDemoDraft<StoredDraft<TValues>>(key)
      : null;
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
  schemaVersion = 1,
) => {
  if (!userId || typeof window === "undefined") {
    return;
  }
  const now = new Date();
  if (isDemoUser(userId)) {
    if (!isActiveDemoUser(userId)) return;
    writeDemoDraft(createDraftStorageKey(userId, scope), {
      schemaVersion,
      values,
      updatedAt: now.toISOString(),
      expiresAt: now.toISOString(),
    });
    return;
  }
  const expiresAt = new Date(now);

  expiresAt.setDate(expiresAt.getDate() + DEFAULT_DRAFT_TTL_DAYS);
  window.localStorage.setItem(
    createDraftStorageKey(userId, scope),
    JSON.stringify({
      schemaVersion,
      values,
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies StoredDraft<TValues>),
  );
};

export const removeStoredDraft = (
  userId: number | null | undefined,
  scope: string,
) => {
  if (!userId || typeof window === "undefined") {
    return;
  }
  const key = createDraftStorageKey(userId, scope);
  if (isDemoUser(userId)) {
    removeDemoDraft(key);
    return;
  }
  window.localStorage.removeItem(key);
};
