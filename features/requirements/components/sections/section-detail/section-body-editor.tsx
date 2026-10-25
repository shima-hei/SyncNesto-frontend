"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MarkdownTextarea } from "@/components/shared/forms/markdown-textarea";
import { useSectionEdits } from "../../../hooks/use-section-edits";
import { useUpdateRequirementSection } from "../../../hooks/use-update-requirement-section";
import { sectionEditBuffer } from "../../../lib/section-edit-buffer";

export function SectionBodyEditor({
  projectId,
  documentId,
  sectionId,
  canUpdate,
  currentVersion,
}: {
  projectId: number;
  documentId: number;
  sectionId: number;
  canUpdate: boolean;
  currentVersion: number;
}) {
  const { scope, edits } = useSectionEdits(projectId, documentId);
  const { updateRequirementSectionContent } = useUpdateRequirementSection(
    projectId,
    documentId,
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const edit = edits[sectionId];
  if (!edit) return null;
  const saving = edit.request !== null;
  const changed = sectionEditBuffer.dirty(edit);
  const save = async () => {
    if (!canUpdate) return;
    const sent = sectionEditBuffer.startSave(scope, sectionId);
    if (!sent) return;
    try {
      await updateRequirementSectionContent(
        sectionId,
        sent.section.version,
        sent.content,
      );
      sectionEditBuffer.finishSave(scope, sectionId, sent.request);
    } catch (error) {
      sectionEditBuffer.failSave(
        scope,
        sectionId,
        sent.request,
        error instanceof Error
          ? error
          : new Error("本文を保存できませんでした。"),
      );
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <FieldGroup>
        <Field>
          <FieldLabel className="sr-only" htmlFor={`section-body-${sectionId}`}>
            章本文
          </FieldLabel>
          <MarkdownTextarea
            id={`section-body-${sectionId}`}
            value={edit.content}
            disabled={saving || !canUpdate}
            onChange={(content) =>
              sectionEditBuffer.change(scope, sectionId, content)
            }
          />
          <FieldDescription>
            入力はこのタブ内で保持します。再読込・終了する前に保存してください。
          </FieldDescription>
        </Field>
      </FieldGroup>
      {currentVersion !== edit.section.version ? (
        <Alert>
          <AlertTitle>保存済みの版が変わっています</AlertTitle>
          <AlertDescription>
            編集中の本文は残しています。自動で最新版に上書きしません。
          </AlertDescription>
        </Alert>
      ) : null}
      {!canUpdate ? (
        <p role="alert" className="text-sm">
          現在は編集できません。入力は残しています。
        </p>
      ) : null}
      {edit.error ? (
        <div role="alert" className="flex flex-col gap-1">
          <FormApiError error={edit.error} />
          <p className="text-sm">
            入力は残しています。版が変わった場合は本文をコピーし、保存済みの内容と確認してから編集し直してください。
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={!changed || saving || !canUpdate}
          onClick={() => void save()}
        >
          {saving ? "保存中…" : "章本文を保存"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            if (changed) setDiscardOpen(true);
            else sectionEditBuffer.discard(scope, sectionId);
          }}
        >
          {changed ? "変更を破棄" : "編集を閉じる"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void navigator.clipboard
              .writeText(edit.content)
              .then(() => toast.success("本文をコピーしました。"))
              .catch(() => toast.error("本文を選択してコピーしてください。"))
          }
        >
          本文をコピー
        </Button>
        <span className="text-xs text-muted-foreground">
          {changed ? "未保存" : "変更なし"}・編集開始時の版{" "}
          {edit.section.version}
        </span>
      </div>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              この章の未保存の本文を破棄しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              保存済みの本文は変わりません。他の章の未保存入力は保持します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>編集を続ける</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sectionEditBuffer.discard(scope, sectionId)}
            >
              この章の変更を破棄
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
