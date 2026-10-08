"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useDeleteDraftDraftsDraftIdDelete,
  useListDraftsDraftsGet,
  useUpsertDraftDraftsScopeKeyPut,
} from "@/lib/api/generated/drafts/drafts";
import type { DraftRead } from "@/lib/api/generated/model";
import {
  readStoredDraft,
  removeStoredDraft,
  type StoredDraft,
  writeStoredDraft,
} from "@/lib/draft/draft-storage";
import { getDraftSession, isCurrentDraftSession } from "@/lib/demo/session";

type UseFormDraftOptions<TValues> = {
  userId: number | null | undefined;
  scope: string;
  values: TValues;
  initialValues: TValues;
  schemaVersion?: number;
  debounceMs?: number;
  serverDraft?: {
    enabled: boolean;
    resourceType: string;
    resourceId?: number | null;
    projectId?: number | null;
  };
  onRestore: (values: TValues) => void;
};

export const useFormDraft = <TValues>({
  userId,
  scope,
  values,
  initialValues,
  schemaVersion = 1,
  debounceMs = 750,
  serverDraft,
  onRestore,
}: UseFormDraftOptions<TValues>) => {
  const [handledDraftKey, setHandledDraftKey] = useState<string | null>(null);
  const serializedValues = useMemo(() => JSON.stringify(values), [values]);
  const serializedInitialValues = useMemo(
    () => JSON.stringify(initialValues),
    [initialValues],
  );
  const draftSession = userId ? getDraftSession(userId) : null;
  const draftKey = `${draftSession ?? "anonymous"}:${scope}:${schemaVersion}`;
  const serverDraftEnabled = Boolean(userId && serverDraft?.enabled);
  const serverDraftsQuery = useListDraftsDraftsGet(
    {
      resource_type: serverDraft?.resourceType,
      project_id: serverDraft?.projectId ?? undefined,
    },
    {
      query: {
        enabled: serverDraftEnabled,
        retry: false,
      },
    },
  );
  const upsertServerDraft = useUpsertDraftDraftsScopeKeyPut();
  const deleteServerDraft = useDeleteDraftDraftsDraftIdDelete();
  const currentServerDraft = useMemo(() => {
    return serverDraftsQuery.data?.items.find(
      (item) => item.scope_key === scope,
    );
  }, [scope, serverDraftsQuery.data?.items]);
  const pendingDraft = useMemo(() => {
    if (handledDraftKey === draftKey) {
      return null;
    }
    return (
      readStoredDraft<TValues>(userId, scope, schemaVersion, draftSession) ??
      toStoredDraft<TValues>(currentServerDraft)
    );
  }, [
    currentServerDraft,
    draftKey,
    draftSession,
    handledDraftKey,
    schemaVersion,
    scope,
    userId,
  ]);

  useEffect(() => {
    if (!userId || serializedValues === serializedInitialValues) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      if (!isCurrentDraftSession(userId, draftSession)) return;
      writeStoredDraft(userId, scope, values, schemaVersion, draftSession);
      setHandledDraftKey(draftKey);
      if (serverDraftEnabled && serverDraft) {
        upsertServerDraft.mutate({
          scopeKey: scope,
          data: {
            resource_type: serverDraft.resourceType,
            resource_id: serverDraft.resourceId ?? null,
            project_id: serverDraft.projectId ?? null,
            schema_version: schemaVersion,
            content: values as Record<string, unknown>,
            version: currentServerDraft?.version,
          },
        });
      }
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    debounceMs,
    currentServerDraft?.version,
    draftKey,
    draftSession,
    schemaVersion,
    scope,
    serializedInitialValues,
    serializedValues,
    serverDraft,
    serverDraftEnabled,
    upsertServerDraft,
    userId,
    values,
  ]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }
    onRestore(pendingDraft.values);
    setHandledDraftKey(draftKey);
  }, [draftKey, onRestore, pendingDraft]);

  const discardDraft = useCallback(() => {
    removeStoredDraft(userId, scope, draftSession);
    setHandledDraftKey(draftKey);
  }, [draftKey, draftSession, scope, userId]);

  const clearDraft = useCallback(() => {
    if (!userId || !isCurrentDraftSession(userId, draftSession)) return;
    removeStoredDraft(userId, scope, draftSession);
    if (currentServerDraft) {
      deleteServerDraft.mutate({ draftId: currentServerDraft.id });
    }
    setHandledDraftKey(draftKey);
  }, [
    currentServerDraft,
    deleteServerDraft,
    draftKey,
    draftSession,
    scope,
    userId,
  ]);

  return {
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
};

const toStoredDraft = <TValues>(
  draft: DraftRead | null | undefined,
): StoredDraft<TValues> | null => {
  if (!draft) {
    return null;
  }
  return {
    schemaVersion: draft.schema_version,
    values: draft.content as TValues,
    updatedAt: draft.updated_at,
    expiresAt: draft.expires_at,
  };
};
