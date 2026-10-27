"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useSectionEdits } from "./use-section-edits";
import { workbenchState } from "../lib/workbench-state";

type Scope = { identity: string; scope: string; prefix: string };
const WorkbenchContext = createContext<Scope | null>(null);

export function RequirementWorkbenchProvider({
  projectId,
  documentId,
  children,
}: {
  projectId: number;
  documentId: number;
  children: ReactNode;
}) {
  const { scope } = useSectionEdits(projectId, documentId);
  const identity = scope.split(":").slice(0, 3).join(":");
  useLayoutEffect(() => workbenchState.activate(identity), [identity]);
  return (
    <WorkbenchContext.Provider value={{ identity, scope, prefix: "" }}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export function WorkbenchTargetScope({
  target,
  children,
}: {
  target: string;
  children: ReactNode;
}) {
  const context = useContext(WorkbenchContext);
  return (
    <WorkbenchContext.Provider
      value={context ? { ...context, prefix: target } : null}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export const useWorkbenchScope = () => useContext(WorkbenchContext);

export function useWorkbenchState<T>(key: string, initial: T) {
  const context = useWorkbenchScope();
  const [local, setLocal] = useState(initial);
  const fallback = useRef(initial);
  const identity = context?.identity ?? "";
  const scope = context?.scope ?? "";
  const name = `${context?.prefix ?? ""}/${key}`;
  const read = useCallback(
    () => workbenchState.read<T>(identity, scope, name) ?? fallback.current,
    [identity, scope, name],
  );
  const value = useSyncExternalStore(
    workbenchState.subscribe,
    read,
    () => fallback.current,
  );
  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      if (!context?.scope) {
        setLocal(next);
        return;
      }
      const current = read();
      workbenchState.write(
        identity,
        scope,
        name,
        typeof next === "function"
          ? (next as (current: T) => T)(current)
          : next,
      );
    },
    [context?.scope, read, identity, scope, name],
  );
  return [context?.scope ? value : local, setValue] as const;
}
