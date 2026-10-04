export const DRAFT_STORAGE_PREFIX = "syncnesto:draft";

export const createDraftScope = (
  domain: string,
  resource: string,
  action: "create" | "update",
  projectId: number,
  resourceId?: number | null,
) => {
  return [domain, resource, action, projectId, resourceId ?? null]
    .filter((part) => part !== null)
    .join(":");
};

export const createDraftStorageKey = (userId: number, scope: string) => {
  return `${DRAFT_STORAGE_PREFIX}:user:${userId}:tenant:${getApiTenant() ?? "none"}:${scope}`;
};
import { getApiTenant } from "@/lib/api/tenant-context";
