"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import {
  emptySectionEdits,
  sectionEditBuffer,
} from "../lib/section-edit-buffer";

export function useSectionEdits(projectId: number, documentId: number) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const scope =
    user && tenant
      ? `${user.id}:${user.demo?.id ?? "normal"}:${tenant.id}:${projectId}:${documentId}`
      : "";
  const edits = useSyncExternalStore(
    sectionEditBuffer.subscribe,
    () => (scope ? sectionEditBuffer.get(scope) : emptySectionEdits),
    () => emptySectionEdits,
  );
  return {
    scope,
    edits,
    unsaved: Object.values(edits).filter(sectionEditBuffer.dirty),
  };
}
