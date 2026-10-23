import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";

export const objectiveFieldLabels = {
  project_goal: "ゴール・実現すること",
  project_scope: "対象範囲・対象外",
  project_completion_criteria: "案件の完了条件",
} as const;

export function ProjectObjectiveFields({
  values,
}: {
  values: Partial<Record<keyof typeof objectiveFieldLabels, string | null>>;
}) {
  return (
    <dl className="flex min-w-0 flex-col gap-5">
      {Object.entries(objectiveFieldLabels).map(([key, label]) => (
        <div key={key} className="flex min-w-0 flex-col gap-2">
          <dt className="text-sm font-medium">{label}</dt>
          <dd className="min-w-0 text-sm">
            <MarkdownPreview
              className="min-h-0 break-words"
              value={values[key as keyof typeof objectiveFieldLabels] ?? ""}
              emptyMessage="未登録です。必要に応じて要件定義書で追記できます。"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
