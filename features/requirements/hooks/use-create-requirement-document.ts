"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createRequirementDocumentProjectsProjectIdRequirementDocumentsPost,
  createStandardRequirementDocumentProjectsProjectIdRequirementDocumentsStandardPost,
} from "@/lib/api/generated/requirements/requirements";
import { ApiError } from "@/lib/api/error";
import {
  getTenantSelectionSnapshot,
  subscribeTenantSelection,
} from "@/lib/api/tenant-context";
import { getDraftSession } from "@/lib/demo/session";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { canUpdateRequirement } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { browserStandardCreationStore } from "../lib/browser-standard-creation-store";
import { EMPTY_CREATION_SNAPSHOT } from "../lib/standard-creation-store";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementDocumentList } from "../lib/requirement-cache";
import { toRequirementDocumentCreate } from "../lib/requirement-mappers";
import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

const serverTenant = () => undefined;
const emptySnapshot = () => EMPTY_CREATION_SNAPSHOT;
const emptySubscription = () => () => {};

export function useCreateRequirementDocument(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const tenant = useSyncExternalStore(
    subscribeTenantSelection,
    getTenantSelectionSnapshot,
    serverTenant,
  );
  const session = user ? getDraftSession(user.id) : null;
  const store = useMemo(
    () =>
      userId && session && tenant !== undefined
        ? browserStandardCreationStore(userId, projectId, tenant)
        : null,
    [userId, session, tenant, projectId],
  );
  const snapshot = useSyncExternalStore(
    store?.subscribe ?? emptySubscription,
    store?.getSnapshot ?? emptySnapshot,
    emptySnapshot,
  );
  const role = useCurrentProjectRole(projectId);
  const canUseStandard = canUpdateRequirement(role.currentProjectRole);
  const attempt = snapshot.attempt;
  const formScope = `${userId}:${session}:${tenant}:${projectId}`;
  const [deletedOutcome, setDeletedOutcome] = useState<{
    scope: string;
    key: string;
  } | null>(null);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (values: RequirementDocumentFormValues) => {
      setDeletedOutcome(null);
      if (!store || !snapshot.ready || snapshot.error)
        throw new Error("作成前の確認が完了していません。");
      const previous = store.read();
      if (previous && !attempt) {
        store.refresh();
        throw new Error(
          "前の送信結果を先に確認してください。入力中の内容は下書きに残ります。",
        );
      }
      const headers = new Headers();
      if (typeof tenant === "number")
        headers.set("X-Tenant-ID", String(tenant));
      const options = { headers };
      if (!previous && (values.standardChapters === false || !canUseStandard)) {
        store.assertCurrent();
        const document =
          await createRequirementDocumentProjectsProjectIdRequirementDocumentsPost(
            projectId,
            toRequirementDocumentCreate(values),
            options,
          );
        store.assertCurrent();
        return { document, replayed: false, store };
      }
      const fresh = !previous;
      const pending =
        previous ??
        store.save({
          schemaVersion: 1,
          values,
          data: {
            ...toRequirementDocumentCreate(values),
            request_key: crypto.randomUUID(),
            template_version: "standard_v1",
          },
        });
      try {
        store.assertCurrent();
        const result =
          await createStandardRequirementDocumentProjectsProjectIdRequirementDocumentsStandardPost(
            projectId,
            pending.data,
            options,
          );
        store.assertCurrent();
        // 保存結果は確定済み。片付けに失敗しても再送は同じ結果を返す。
        try {
          store.clear(pending.data.request_key);
        } catch {
          /* 保持した送信情報を次回の確認に使う。 */
        }
        return { ...result, store };
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "REQUIREMENT_DOCUMENT_CREATION_TARGET_DELETED"
        ) {
          store.assertCurrent();
          setDeletedOutcome({
            scope: formScope,
            key: pending.data.request_key,
          });
          throw error;
        }
        // 初回の確定した拒否だけ編集へ戻す。再表示/再送後や5xxは元の内容を保持する。
        if (
          fresh &&
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          store.clear(pending.data.request_key);
        }
        throw error;
      }
    },
    onSuccess: async ({ document, replayed, store: submittedStore }) => {
      await invalidateRequirementDocumentList(queryClient, projectId);
      try {
        submittedStore.assertCurrent();
      } catch {
        return;
      }
      toast.success(
        replayed
          ? "作成済みの文書を開きます。"
          : REQUIREMENT_MESSAGES.document.createSuccess,
      );
      router.push(
        `/projects/joined/${projectId}/requirements/${document.id}?tab=requirements`,
      );
    },
    onError: (error) => {
      toast.error(error.message || REQUIREMENT_MESSAGES.document.createError);
    },
  });

  return {
    createRequirementDocument: async (
      values: RequirementDocumentFormValues,
    ) => {
      const result = await mutation.mutateAsync(values);
      result.store.assertCurrent();
      return result.document;
    },
    isReady: Boolean(store && snapshot.ready && role.currentProjectRole),
    canSubmit: Boolean(
      store && snapshot.ready && !snapshot.error && role.currentProjectRole,
    ),
    formScope,
    finishDeletedAttempt:
      store &&
      attempt &&
      deletedOutcome?.scope === formScope &&
      deletedOutcome.key === attempt.data.request_key
        ? () => {
            try {
              store.clear(deletedOutcome.key);
              setDeletedOutcome(null);
              mutation.reset();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "確認を終了できませんでした。",
              );
            }
          }
        : undefined,
    canUseStandard,
    attempt,
    isPending: mutation.isPending,
    error: snapshot.error ? snapshot.error : (mutation.error ?? role.error),
  };
}
