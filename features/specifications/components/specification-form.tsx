"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { getConflictCurrent, getConflictFields } from "@/lib/api/conflict";
import { createDraftScope } from "@/lib/draft/draft-key";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useAuth } from "@/features/auth/providers/auth-provider";
import type {
  SpecificationRead,
  SpecificationLinkCreate,
} from "@/lib/api/generated/model";
import { addLink, createSpecification, updateSpecification } from "../lib/api";
import {
  initialValues,
  kindLabels,
  specificationHref,
  specificationKeys,
  toCreate,
  type Kind,
  type Values,
} from "../lib/specification";
import { SpecificationFields } from "./specification-fields";
import { mergeSpecifications, describeConflict } from "../lib/merge";
import { reviewPathLabel } from "../lib/specification";

export function SpecificationForm({
  projectId,
  row,
  kind,
}: {
  projectId: number;
  row?: SpecificationRead;
  kind: Kind;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const cache = useQueryClient();
  const { user } = useAuth();
  const [initial] = useState(() => initialValues(kind, row));
  const [initialVersion] = useState(row?.version);
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState<SpecificationRead | null>(null);
  const [validation, setValidation] = useState("");
  const draft = useFormDraft({
    userId: saved ? null : user?.id,
    scope: createDraftScope(
      "specifications",
      kind,
      row ? "update" : "create",
      projectId,
      row?.id,
    ),
    values,
    initialValues: initial,
    onRestore: setValues,
  });
  const dirty = !saved && JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    const focus = params.get("focus");
    if (focus) {
      const element = document.getElementById(
        `specification-field-${encodeURIComponent(focus)}`,
      );
      if (!element) {
        toast.info(
          "この指摘の対象項目は削除されています。現在の設計内容と指摘を確認して修正してください。",
        );
        return;
      }
      element?.closest("details")?.setAttribute("open", "");
      element?.scrollIntoView({ block: "center" });
      element
        ?.querySelector<HTMLElement>("input,textarea,button")
        ?.focus({ preventScroll: true });
    }
  }, [params]);
  const save = useMutation({
    mutationFn: ({ data, version }: { data: Values; version?: number }) =>
      row
        ? updateSpecification(projectId, row.id, {
            ...toCreate(data),
            version: version ?? initialVersion!,
          })
        : createSpecification(projectId, toCreate(data)),
    onSuccess: async (result) => {
      setSaved(true);
      draft.clearDraft();
      setConflict(null);
      cache.setQueryData(
        specificationKeys.detail(projectId, result.id),
        result,
      );
      await cache.invalidateQueries({
        queryKey: specificationKeys.all(projectId),
      });
      const source = params.get("source");
      const sourceId = params.get("sourceId");
      if (
        !row &&
        sourceId &&
        (source === "requirement" ||
          source === "task" ||
          source === "test_item" ||
          source === "specification" ||
          source === "document")
      ) {
        try {
          await addLink(projectId, result.id, {
            target_type: source,
            target_id: sourceId,
          } as SpecificationLinkCreate);
        } catch {
          toast.error(
            "設計書は保存しました。関連付けは「関連」から再設定してください。",
          );
        }
      }
      toast.success(`${kindLabels[kind]}を保存しました。`);
      router.push(
        `${specificationHref(projectId, result.id)}?tab=${row ? "review" : "links"}`,
      );
    },
    onError: (error) =>
      setConflict(getConflictCurrent<SpecificationRead>(error)),
  });
  const current = conflict ? initialValues(kind, conflict) : null;
  const comparison = current
    ? mergeSpecifications(initial, values, current)
    : null;
  const conflictEntries = comparison
    ? Object.entries(comparison.conflicts)
    : [];
  const originalFields = Object.fromEntries(
    conflictEntries.map(([key, value]) => [key, value.original]),
  );
  const localFields = Object.fromEntries(
    conflictEntries.map(([key, value]) => [key, value.local]),
  );
  const currentFields = Object.fromEntries(
    conflictEntries.map(([key, value]) => [key, value.current]),
  );
  return (
    <>
      <form
        className="flex min-w-0 max-w-4xl flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!values.title.trim()) {
            setValidation("設計書名を入力してください。");
            document.getElementById("specification-field-title-input")?.focus();
            return;
          }
          setValidation("");
          save.mutate({ data: values });
        }}
      >
        <Alert>
          <AlertDescription>
            まず名前と目的から記入します。未確定の項目は空欄のまま保存でき、関連付けやレビューは保存後に進められます。
          </AlertDescription>
        </Alert>
        {validation && (
          <p role="alert" className="text-sm text-destructive">
            {validation}
          </p>
        )}
        <fieldset disabled={save.isPending} className="min-w-0">
          <legend className="sr-only">{kindLabels[kind]}の内容</legend>
          <SpecificationFields values={values} onChange={setValues} />
        </fieldset>
        <FormApiError error={save.error} />
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-3">
          <span className="mr-auto text-xs text-muted-foreground">
            {dirty
              ? "未保存の変更があります。入力中の内容は下書きとして保持します。"
              : row
                ? `版 ${initialVersion}`
                : "名前だけで下書きを作成できます。"}
          </span>
          <Button asChild variant="outline">
            <Link href={specificationHref(projectId, row?.id)}>戻る</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "保存中…"
              : row
                ? "変更を保存"
                : "保存して関連付けへ"}
          </Button>
        </div>
      </form>
      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onRestore={draft.restoreDraft}
        onDiscard={draft.discardDraft}
      />
      {conflict && current && (
        <ConflictResolutionDialog
          open
          key={conflict.version}
          fields={getConflictFields({
            original: originalFields,
            local: localFields,
            current: currentFields,
          })}
          localValues={localFields}
          currentValues={currentFields}
          fieldLabels={Object.fromEntries(
            conflictEntries.map(([key]) => [
              key,
              key.endsWith("/@order")
                ? "項目の順番"
                : reviewPathLabel(values, key),
            ]),
          )}
          valueFormatters={Object.fromEntries(
            conflictEntries.map(([key]) => [
              key,
              (value: unknown) => describeConflict(value, [values, current]),
            ]),
          )}
          isPending={save.isPending}
          onOpenChange={(open) => !open && setConflict(null)}
          onResolve={(resolved) => {
            const data = mergeSpecifications(
              initial,
              values,
              current,
              Object.fromEntries(
                conflictEntries.map(([key, entry]) => [
                  key,
                  JSON.stringify(resolved[key]) ===
                  JSON.stringify(entry.current)
                    ? ("current" as const)
                    : ("local" as const),
                ]),
              ),
            ).values;
            setValues(data);
            return save
              .mutateAsync({
                data,
                version: conflict.version,
              })
              .catch(() => undefined);
          }}
        />
      )}
    </>
  );
}
