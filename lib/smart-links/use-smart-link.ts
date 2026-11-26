"use client";

import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { resolveSmartLinksSearchSmartLinksResolvePost } from "@/lib/api/generated/search/search";
import type { SmartLinkRead } from "@/lib/api/generated/model/smartLinkRead";
import type { SmartLinkReference } from "@/lib/api/generated/model/smartLinkReference";
import {
  getTenantSelectionSnapshot,
  subscribeTenantSelection,
} from "@/lib/api/tenant-context";

import { smartLinkKey, type ParsedSmartLink } from "./reference";

type WaitingReference = {
  reference: SmartLinkReference;
  resolve: (result: SmartLinkRead | null) => void;
  reject: (reason: unknown) => void;
};

const batches = new Map<string, WaitingReference[]>();

function batchResolve(
  scope: string,
  tenantId: number,
  reference: SmartLinkReference,
  preview: boolean,
): Promise<SmartLinkRead | null> {
  const key = JSON.stringify([scope, preview]);
  return new Promise((resolve, reject) => {
    const waiting = batches.get(key);
    const entry = { reference, resolve, reject };
    if (waiting) {
      waiting.push(entry);
      return;
    }
    batches.set(key, [entry]);
    setTimeout(() => {
      const entries = batches.get(key) ?? [];
      batches.delete(key);
      if (getTenantSelectionSnapshot() !== tenantId) {
        entries.forEach(({ reject }) => reject(new Error("Tenant changed")));
        return;
      }
      for (let offset = 0; offset < entries.length; offset += 40) {
        const chunk = entries.slice(offset, offset + 40);
        const unique = new Map(
          chunk.map(({ reference }) => [smartLinkKey(reference), reference]),
        );
        void resolveSmartLinksSearchSmartLinksResolvePost({
          references: [...unique.values()],
          preview,
        }).then(
          (items) => {
            const byKey = new Map(
              items.map((item) => [smartLinkKey(item), item]),
            );
            chunk.forEach(({ reference, resolve }) =>
              resolve(byKey.get(smartLinkKey(reference)) ?? null),
            );
          },
          (error: unknown) => chunk.forEach(({ reject }) => reject(error)),
        );
      }
    }, 16);
  });
}

export function useSmartLinkScope() {
  const { user } = useAuth();
  const tenantId = useSyncExternalStore(
    subscribeTenantSelection,
    getTenantSelectionSnapshot,
    () => undefined,
  );
  return {
    tenantId,
    scope:
      user?.user_type === "internal" && tenantId
        ? JSON.stringify([user.id, tenantId, user.demo?.id ?? null])
        : null,
  };
}

export function useSmartLink(
  link: ParsedSmartLink | null,
  enabled: boolean,
  preview = false,
) {
  const { scope, tenantId } = useSmartLinkScope();
  const client = useQueryClient();
  const reference = link?.reference;
  const key = ["smart-link", scope, reference ? smartLinkKey(reference) : null];
  const allowed = Boolean(
    enabled &&
    scope &&
    tenantId &&
    reference &&
    (link?.tenantId === undefined || tenantId === link.tenantId),
  );
  const query = useQuery({
    queryKey: [...key, preview],
    enabled: allowed,
    staleTime: preview ? 0 : 10_000,
    gcTime: 45_000,
    retry: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!scope || !tenantId || !reference) return null;
      const found = await batchResolve(scope, tenantId, reference, preview);
      if (preview) {
        client.setQueryData(
          [...key, false],
          found ? { ...found, preview: null } : null,
        );
      }
      return found;
    },
  });
  return { ...query, data: allowed && !query.isError ? query.data : undefined };
}
