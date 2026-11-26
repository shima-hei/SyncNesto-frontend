import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type RequirementVersionChange = {
  id: string;
  label: string;
  type: "追加" | "削除" | "変更";
  fields: { field: string; before: unknown; after: unknown }[];
  extra?: ReactNode;
};

export function RequirementVersionChanges({
  changes,
}: {
  changes: RequirementVersionChange[];
}) {
  if (!changes.length)
    return (
      <p className="py-2 text-sm text-muted-foreground">
        本文の変更はありません。
      </p>
    );

  return (
    <ul className="grid gap-2 border-y py-3 text-sm">
      {changes.map((change) => (
        <li key={change.id} className="grid min-w-0 gap-1">
          <details>
            <summary className="cursor-pointer rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-ring">
              <Badge variant="outline" className="me-2">
                {change.type}
              </Badge>
              <span className="[overflow-wrap:anywhere]">{change.label}</span>
            </summary>
            <dl className="mb-3 grid gap-3 border-s ps-3">
              {change.fields.map((entry) => (
                <div key={entry.field} className="grid min-w-0 gap-1">
                  <dt className="font-medium">
                    {fieldLabels[entry.field] ?? "詳細項目"}
                  </dt>
                  <dd className="grid min-w-0 gap-2 md:grid-cols-2">
                    <div className="min-w-0 rounded-md border p-2">
                      <p className="text-xs text-muted-foreground">
                        承認済み版
                      </p>
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {formatDiffValue(entry.before)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-md border p-2">
                      <p className="text-xs text-muted-foreground">
                        承認対象版
                      </p>
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {formatDiffValue(entry.after)}
                      </p>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
            {change.extra}
          </details>
        </li>
      ))}
    </ul>
  );
}

function formatDiffValue(value: unknown): string {
  if (value == null || value === "") return "―";
  return typeof value === "string"
    ? value
    : (JSON.stringify(value, null, 2) ?? "―");
}

const fieldLabels: Record<string, string> = {
  title: "タイトル",
  content: "本文",
  description: "要件の内容",
  rationale: "背景・理由",
  acceptance_criteria: "受け入れ条件",
  priority: "優先度",
  purpose: "目的",
  project_goal: "案件の目標",
  project_scope: "対象範囲",
  project_completion_criteria: "案件の完了条件",
  parent: "所属する章",
  position: "表示順",
  requirement_type: "種別",
  category: "カテゴリ",
  requirement_code: "要件番号",
  document_code: "文書コード",
  target_system_name: "対象システム",
  client_name: "顧客・利用部門",
  section_type: "章の種類",
  details: "種別別の詳細",
  kind: "設計の種類",
  summary: "概要",
  detail_json: "詳細の内容",
  detail_type: "詳細の種類",
};
