import type { RequirementSectionRead } from "@/lib/api/generated/model";

export type SectionEdit = {
  section: RequirementSectionRead;
  content: string;
  request: number | null;
  error: Error | null;
};
type Edits = Readonly<Record<number, SectionEdit>>;
const empty: Edits = Object.freeze({});

export function createSectionEditBuffer() {
  const scopes = new Map<string, Edits>();
  const listeners = new Set<() => void>();
  let serial = 0;
  let listening = false;
  const get = (scope: string) => scopes.get(scope) ?? empty;
  const dirty = (edit: SectionEdit) =>
    edit.content !== (edit.section.content ?? "");
  const hasUnsaved = () =>
    [...scopes.values()].some((edits) => Object.values(edits).some(dirty));
  const beforeUnload = (event: {
    preventDefault: () => void;
    returnValue?: string;
  }) => {
    if (!hasUnsaved()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  const publish = () => {
    if (typeof window !== "undefined") {
      if (hasUnsaved() && !listening) {
        window.addEventListener("beforeunload", beforeUnload);
        listening = true;
      } else if (!hasUnsaved() && listening) {
        window.removeEventListener("beforeunload", beforeUnload);
        listening = false;
      }
    }
    listeners.forEach((listener) => listener());
  };
  const put = (scope: string, id: number, edit: SectionEdit | null) => {
    const next = { ...get(scope) };
    if (edit) next[id] = edit;
    else delete next[id];
    if (Object.keys(next).length) scopes.set(scope, next);
    else scopes.delete(scope);
    publish();
  };
  return {
    get,
    dirty,
    hasUnsaved,
    beforeUnload,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin(scope: string, section: RequirementSectionRead) {
      if (get(scope)[section.id]) return;
      put(scope, section.id, {
        section: { ...section },
        content: section.content ?? "",
        request: null,
        error: null,
      });
    },
    change(scope: string, id: number, content: string) {
      const edit = get(scope)[id];
      if (edit && edit.request === null) put(scope, id, { ...edit, content });
    },
    discard(scope: string, id: number) {
      if (get(scope)[id]?.request == null) put(scope, id, null);
    },
    startSave(scope: string, id: number) {
      const edit = get(scope)[id];
      if (!edit || !dirty(edit) || edit.request !== null) return null;
      const request = ++serial;
      put(scope, id, { ...edit, request, error: null });
      return { ...edit, request };
    },
    finishSave(scope: string, id: number, request: number) {
      if (get(scope)[id]?.request === request) put(scope, id, null);
    },
    failSave(scope: string, id: number, request: number, error: Error) {
      const edit = get(scope)[id];
      if (edit?.request === request)
        put(scope, id, { ...edit, request: null, error });
    },
  };
}

// このタブのメモリだけに置き、章/タブ/SPAの戻るで破棄しない。
export const sectionEditBuffer = createSectionEditBuffer();
export const emptySectionEdits = empty;
