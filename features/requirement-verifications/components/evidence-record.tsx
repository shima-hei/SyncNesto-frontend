import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { formatDateTime } from "@/lib/format/date";
import type { EvidenceEntryDetail } from "@/lib/api/generated/model";
import {
  evidenceRecord as record,
  evidenceText as text,
  evidenceKinds,
  evidenceResults,
} from "../lib/evidence";

function ExecutionSource({ value }: { value: unknown }) {
  const source = record(value),
    item = record(source.item),
    columns = record(source.columns),
    pattern = record(source.pattern);
  const fields: Record<string, string> = {
    target_feature: "対象機能",
    viewpoint: "観点",
    content: "内容",
    preconditions: "事前条件",
    test_data: "テストデータ",
    steps: "手順",
    expected_result: "期待結果",
    notes: "備考",
  };
  const custom = record(item.custom_values);
  const expected = Array.isArray(source.expected_values)
    ? source.expected_values
    : source.expected_value
      ? [source.expected_value]
      : [];
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">実行時のテスト内容</h3>
      {Object.entries({
        ...fields,
        ...Object.fromEntries(
          Object.keys(custom).map((k) => [k, text(columns[k]) || k]),
        ),
      }).map(([key, label]) => {
        const value = text(item[key] ?? custom[key]);
        return value ? (
          <div key={key}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <MarkdownPreview value={value} />
          </div>
        ) : null;
      })}
      {source.pattern ? (
        <p>
          組み合わせ：{text(pattern.code)} {text(pattern.description)}{" "}
          {text(pattern.notes)}
        </p>
      ) : null}
      {Array.isArray(source.values)
        ? source.values.map((v, index) => {
            const r = record(v);
            return (
              <p key={index}>
                {text(r.factor)}：{text(r.level) || "未設定"}
              </p>
            );
          })
        : null}
      {expected.map((v, index) => {
        const r = record(v);
        return (
          <p key={index}>
            組み合わせの期待値：{text(r.name)} {text(r.value)}{" "}
            {text(r.description)}
          </p>
        );
      })}
    </section>
  );
}

export function EvidenceRecord({ value }: { value: EvidenceEntryDetail }) {
  const entry = value.entry,
    execution = record(entry.execution);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">{text(entry.row_description)}</h3>
      <p>
        {evidenceKinds[text(entry.kind)]} ·{" "}
        {evidenceResults[text(execution.status ?? entry.result)] ??
          "対象外の理由"}
      </p>
      {entry.use === "historical_record" ? (
        <Alert>
          <AlertDescription>
            過去内容の参考記録です。現在の条件を満たす証拠へ自動採用しません。
          </AlertDescription>
        </Alert>
      ) : null}
      {entry.kind === "execution" ? (
        <>
          <p>
            元の実行者：{text(execution.executed_by_name) || "記録なし"} ·
            実行日時：
            {execution.executed_at
              ? formatDateTime(text(execution.executed_at))
              : "記録なし"}
          </p>
          <p className="whitespace-pre-wrap break-words">
            実際の結果：{text(execution.actual_result) || "記録なし"}
          </p>
          {execution.notes ? (
            <p className="whitespace-pre-wrap break-words">
              実行時の備考：{text(execution.notes)}
            </p>
          ) : null}
          <ExecutionSource value={execution.source} />
        </>
      ) : entry.kind === "manual" ? (
        <>
          <p className="whitespace-pre-wrap break-words">
            確認内容：{text(entry.checked_content)}
          </p>
          <p className="whitespace-pre-wrap break-words">
            実際の結果：{text(entry.actual_result)}
          </p>
          <p>申告した確認日時：{formatDateTime(text(entry.reported_at))}</p>
        </>
      ) : null}
      <p className="whitespace-pre-wrap break-words">
        今回の根拠・対応の再確認：{text(entry.reason)}
      </p>
      <p>
        提出・今回の確認：{value.actor_name} · サーバー受付：
        {formatDateTime(value.received_at)}
      </p>
      {entry.kind === "execution" ? (
        <p className="text-sm text-muted-foreground">
          実行時の要件版は未記録です。今回の本人による再確認と区別して保持しています。
        </p>
      ) : null}
    </section>
  );
}
