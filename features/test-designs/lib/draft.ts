import type { Design } from "./design";
import {
  readDemoDraft,
  writeDemoDraft,
  removeDemoDraft,
} from "@/lib/demo/session";

export type DesignDraft = {
  design: Design;
  baseVersion: number;
  savedAt: number;
};
let queue: Promise<unknown> = Promise.resolve();

function transaction<T>(
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const result = queue
    .catch(() => undefined)
    .then(
      () =>
        new Promise<T>((resolve, reject) => {
          const request = indexedDB.open("syncnesto-test-design-drafts", 1);
          request.onupgradeneeded = () =>
            request.result.createObjectStore("drafts");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("drafts", "readwrite");
            const operation = action(tx.objectStore("drafts"));
            tx.oncomplete = () => {
              resolve(operation.result);
              db.close();
            };
            tx.onerror = () => {
              reject(tx.error);
              db.close();
            };
            tx.onabort = () => {
              reject(tx.error);
              db.close();
            };
          };
        }),
    );
  queue = result;
  return result;
}

export const readDraft = (key: string) =>
  key.startsWith("demo:")
    ? Promise.resolve(readDemoDraft<DesignDraft>(key) ?? undefined)
    : transaction<DesignDraft | undefined>((store) => store.get(key));
export const writeDraft = (key: string, draft: DesignDraft) =>
  key.startsWith("demo:")
    ? Promise.resolve(writeDemoDraft(key, draft))
    : transaction((store) => store.put(draft, key));
export const removeDraft = (key: string) =>
  key.startsWith("demo:")
    ? Promise.resolve(removeDemoDraft(key))
    : transaction((store) => store.delete(key));
