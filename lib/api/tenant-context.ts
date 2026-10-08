// 組織選択はタブ単位。CookieのIdentityと組織の認可はBackendで検証する。
let currentTenantId: number | null | undefined = undefined;
const listeners = new Set<() => void>();

export const setApiTenant = (tenantId: number | null) => {
  currentTenantId = tenantId;
  listeners.forEach((listener) => listener());
};

export const getApiTenant = () => currentTenantId ?? null;
export const getTenantSelectionSnapshot = () => currentTenantId;
export const subscribeTenantSelection = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
