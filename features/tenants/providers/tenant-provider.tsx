"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { listMyTenantsTenantsGet } from "@/lib/api/generated/tenants/tenants";
import type { CurrentUserRead, TenantChoice } from "@/lib/api/generated/model";
import {
  setApiTenant,
  getTenantSelectionSnapshot,
  subscribeTenantSelection,
} from "@/lib/api/tenant-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type TenantContextValue = {
  tenant: TenantChoice | null;
  choices: TenantChoice[];
  canManageTenant: boolean;
  switchTenant: (id: number) => void;
  refreshChoices: () => void;
};
const TenantContext = createContext<TenantContextValue | null>(null);
const selectionKey = (userId: number) => `syncnesto:tenant:user:${userId}`;

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const choices = useQuery({
    queryKey: ["tenant-choices", user?.id],
    queryFn: ({ signal }) => listMyTenantsTenantsGet({ signal }),
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: true,
  });
  if (!user || choices.isPending) return <Skeleton className="m-6 h-32" />;
  if (choices.isError)
    return (
      <div className="m-6 flex flex-col gap-3" role="alert">
        <p>組織を取得できませんでした。</p>
        <Button variant="outline" onClick={() => void choices.refetch()}>
          再試行
        </Button>
      </div>
    );
  return (
    <SelectedTenant
      key={user.id}
      user={user}
      choices={choices.data}
      refreshChoices={() => void choices.refetch()}
    >
      {children}
    </SelectedTenant>
  );
}

function SelectedTenant({
  user,
  choices,
  children,
  refreshChoices,
}: {
  user: CurrentUserRead;
  choices: TenantChoice[];
  children: ReactNode;
  refreshChoices: () => void;
}) {
  const selectedId = useSyncExternalStore(
    subscribeTenantSelection,
    getTenantSelectionSnapshot,
    () => undefined,
  );
  const tenant = choices.find((choice) => choice.id === selectedId) ?? null;
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(selectionKey(user.id));
    } catch {
      /* 保存できない場合も本人の所属から選ぶ。 */
    }
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("tenant");
    const selected =
      choices.find((choice) => String(choice.id) === (requested ?? saved)) ??
      choices[0] ??
      null;
    if (selected) {
      try {
        sessionStorage.setItem(selectionKey(user.id), String(selected.id));
      } catch {
        /* このDocument内の選択は継続する。 */
      }
    }
    if (requested !== null) {
      url.searchParams.delete("tenant");
      window.history.replaceState(window.history.state, "", url);
    }
    setApiTenant(selected?.id ?? null);
    return () => setApiTenant(null);
  }, [choices, user.id]);
  if (selectedId === undefined || (selectedId !== null && !tenant))
    return <Skeleton className="m-6 h-32" />;
  return (
    <TenantCache
      key={`${user.id}:${tenant?.id ?? "system"}:${tenant?.role_key ?? "none"}`}
    >
      <TenantContext.Provider
        value={{
          tenant,
          choices,
          refreshChoices,
          canManageTenant:
            tenant?.role_key === "tenant_owner" ||
            tenant?.role_key === "tenant_admin",
          switchTenant: (id) => {
            if (
              id === tenant?.id ||
              !choices.some((choice) => choice.id === id)
            )
              return;
            // 編集中の画面は既存のbeforeunload確認で保護する。選択は次のDocumentに渡す。
            window.location.assign(
              new URL(`/?tenant=${id}`, window.location.origin),
            );
          },
        }}
      >
        {children}
      </TenantContext.Provider>
    </TenantCache>
  );
}

function TenantCache({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const client = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
    });
    return client;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
}

export function TenantAdminGuard({ children }: { children: ReactNode }) {
  const { canManageTenant } = useTenant();
  return canManageTenant ? (
    children
  ) : (
    <p role="alert">この組織の管理権限が必要です。</p>
  );
}
