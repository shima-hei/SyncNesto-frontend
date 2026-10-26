export function createWorkbenchState() {
  let identity = "";
  const scopes = new Map<string, Map<string, unknown>>();
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  return {
    activate(next: string) {
      if (identity === next) return;
      identity = next;
      scopes.clear();
      publish();
    },
    read<T>(owner: string, scope: string, key: string): T | undefined {
      return owner === identity
        ? (scopes.get(scope)?.get(key) as T | undefined)
        : undefined;
    },
    write<T>(owner: string, scope: string, key: string, value: T) {
      if (!owner || owner !== identity) return;
      let values = scopes.get(scope);
      if (!values) scopes.set(scope, (values = new Map()));
      if (Object.is(values.get(key), value)) return;
      values.set(key, value);
      publish();
    },
    remove(owner: string, scope: string, key: string) {
      if (owner === identity && scopes.get(scope)?.delete(key)) publish();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// 同一タブのSPA往復だけで保持し、別の本人/組織へ持ち越さない。
export const workbenchState = createWorkbenchState();
