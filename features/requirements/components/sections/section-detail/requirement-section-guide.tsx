"use client";

import { Button } from "@/components/ui/button";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";
import { standardChapterGuide } from "../../../constants/standard-chapter-guides";

const labels = {
  project_goal: "この文書のゴール",
  project_scope: "この文書の対象範囲",
  project_completion_criteria: "この文書の完了条件",
};

export function RequirementSectionGuide({
  sectionType,
  document,
  objectiveReferencesEnabled = false,
  onOpenDocumentInfo,
}: {
  sectionType: string;
  document?: RequirementDocumentRead;
  objectiveReferencesEnabled?: boolean;
  onOpenDocumentInfo?: () => void;
}) {
  const guide = standardChapterGuide(sectionType);
  if (!guide) return null;
  const showReference = Boolean(objectiveReferencesEnabled && document);
  return (
    <details
      className="min-w-0 rounded-md border p-3 text-sm"
      onClick={(event) => event.stopPropagation()}
    >
      <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2">
        この章を書くヒント（本文には保存されません）
      </summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
        {guide.prompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
      {showReference ? (
        <div className="mt-3 min-w-0 border-t pt-3">
          <p className="font-medium">参照: {labels[guide.objective]}</p>
          <p className="mt-1 break-words whitespace-pre-wrap text-muted-foreground">
            {document?.[guide.objective] ||
              "まだ入力されていません。必要な内容を文書情報で確認できます。"}
          </p>
          {onOpenDocumentInfo ? (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto max-w-full px-0 whitespace-normal text-left"
              onClick={onOpenDocumentInfo}
            >
              文書情報でゴールを確認
            </Button>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            参照表示です。章本文にはコピーしません。
          </p>
        </div>
      ) : null}
    </details>
  );
}
