import type { RequirementDocumentListResponse } from "@/lib/api/generated/model";
import { safeListReturn } from "@/lib/navigation/list-return";

export type RequirementEntry =
  | { kind: "loading" | "error" | "empty" | "multiple" }
  | { kind: "single"; documentId: number };

export function requirementEntryState({
  data,
  fresh,
  fetching,
  placeholder,
  error,
}: {
  data?: RequirementDocumentListResponse;
  fresh: boolean;
  fetching: boolean;
  placeholder: boolean;
  error: unknown;
}): RequirementEntry {
  if (error) return { kind: "error" };
  if (!fresh || fetching || placeholder || !data) return { kind: "loading" };
  if (data.total === 0 && data.items.length === 0) return { kind: "empty" };
  if (
    data.total === 1 &&
    data.items.length === 1 &&
    Number.isSafeInteger(data.items[0].id) &&
    data.items[0].id > 0
  )
    return { kind: "single", documentId: data.items[0].id };
  if (data.total > 1) return { kind: "multiple" };
  return { kind: "error" };
}

export function requirementListHref(
  projectId: number,
  candidate?: string | null,
) {
  const fallback = `/projects/joined/${projectId}/requirements?view=list`;
  const url = new URL(
    safeListReturn(candidate ?? null, fallback),
    "https://syncnesto.invalid",
  );
  url.searchParams.set("view", "list");
  return `${url.pathname}${url.search}`;
}

export function isRequirementSmartEntry(params: URLSearchParams) {
  return params.size === 0;
}
