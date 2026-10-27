import type { StandardRequirementDocumentCreate } from "@/lib/api/generated/model";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

export type StandardCreationAttempt = {
  schemaVersion: 1;
  values: RequirementDocumentFormValues;
  data: StandardRequirementDocumentCreate;
};

type CreationStorage = {
  read: () => string | null;
  write: (value: string) => void;
  remove: () => void;
  isCurrent: () => boolean;
  subscribe?: (listener: () => void) => () => void;
};

export type StandardCreationSnapshot = {
  ready: boolean;
  attempt: StandardCreationAttempt | null;
  error: Error | null;
};
export const EMPTY_CREATION_SNAPSHOT: StandardCreationSnapshot = Object.freeze({
  ready: false,
  attempt: null,
  error: null,
});

const storageError = () =>
  new Error(
    "作成結果を確認するための情報を保持できません。このブラウザーの保存設定を確認してください。",
  );

// 送信済みの情報には下書きの自動期限切れ・破損時の自動削除を適用しない。
export function createStandardCreationStore(storage: CreationStorage) {
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let cached: StandardCreationSnapshot | undefined;
  const notify = () => listeners.forEach((listener) => listener());
  const assertCurrent = () => {
    if (!storage.isCurrent())
      throw new Error(
        "利用者または組織が切り替わりました。元の組織で作成結果を確認してください。",
      );
  };
  const read = (): StandardCreationAttempt | null => {
    assertCurrent();
    try {
      const raw = storage.read();
      if (raw === null) return null;
      const attempt = JSON.parse(raw) as StandardCreationAttempt;
      if (
        attempt.schemaVersion !== 1 ||
        !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
          attempt.data.request_key,
        ) ||
        attempt.data.template_version !== "standard_v1" ||
        typeof attempt.data.title !== "string" ||
        typeof attempt.data.document_code !== "string" ||
        typeof attempt.values.title !== "string" ||
        typeof attempt.values.documentCode !== "string"
      )
        throw storageError();
      Object.freeze(attempt.values);
      Object.freeze(attempt.data);
      return Object.freeze(attempt);
    } catch {
      throw storageError();
    }
  };
  return {
    assertCurrent,
    read,
    refresh: notify,
    getSnapshot(): StandardCreationSnapshot {
      try {
        assertCurrent();
        let raw: string | null;
        try {
          raw = storage.read();
        } catch {
          throw storageError();
        }
        if (cached?.error === null && raw === lastRaw) return cached;
        const attempt = read();
        lastRaw = raw;
        cached = { ready: true, attempt, error: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : storageError().message;
        if (cached?.error?.message === message) return cached;
        cached = { ready: true, attempt: null, error: new Error(message) };
      }
      return cached;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const unsubscribe = storage.subscribe?.(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe?.();
      };
    },
    save(attempt: StandardCreationAttempt) {
      const previous = read();
      const serialized = JSON.stringify(attempt);
      if (previous && JSON.stringify(previous) !== serialized)
        throw new Error("前の送信結果を先に確認してください。");
      if (previous) return previous;
      try {
        storage.write(serialized);
        if (storage.read() !== serialized) throw storageError();
      } catch {
        throw storageError();
      }
      notify();
      return read()!;
    },
    clear(requestKey: string) {
      if (read()?.data.request_key === requestKey) {
        storage.remove();
        notify();
      }
    },
  };
}
