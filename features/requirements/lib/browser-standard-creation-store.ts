import { createDraftScope, createDraftStorageKey } from "@/lib/draft/draft-key";
import { getApiTenant } from "@/lib/api/tenant-context";
import {
  getDraftSession,
  isCurrentDraftSession,
  isDemoUser,
  readDemoDraft,
  writeDemoDraft,
  removeDemoDraft,
} from "@/lib/demo/session";
import { createStandardCreationStore } from "./standard-creation-store";

export function browserStandardCreationStore(
  userId: number,
  projectId: number,
  tenant: number | null,
) {
  const session = getDraftSession(userId);
  const key = createDraftStorageKey(
    userId,
    `${createDraftScope("requirements", "documents", "create", projectId)}:standard-attempt`,
  );
  const demo = isDemoUser(userId);
  return createStandardCreationStore({
    subscribe: (listener) => {
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
    isCurrent: () =>
      typeof window !== "undefined" &&
      isCurrentDraftSession(userId, session) &&
      getApiTenant() === tenant,
    read: () =>
      demo ? readDemoDraft<string>(key) : window.localStorage.getItem(key),
    write: (value) => {
      if (demo) writeDemoDraft(key, value);
      else window.localStorage.setItem(key, value);
    },
    remove: () => {
      if (demo) removeDemoDraft(key);
      else window.localStorage.removeItem(key);
    },
  });
}
