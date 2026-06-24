import type { ChangeLogDiffRow } from "@/lib/change-log/diff";

type ChangeLogCardProps = {
  actionLabel: string;
  actorLabel: string;
  changedAtLabel: string;
  formatValue: (value: unknown, fieldName?: string | null) => string;
  diffRows: ChangeLogDiffRow[];
  fieldName?: string | null;
  fieldLabel?: string | null;
  targetLabel?: string | null;
  updatedFieldLabels?: string[];
  missingFieldLabels?: string[];
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  showRawValues?: boolean;
};

export function ChangeLogCard({
  actionLabel,
  actorLabel,
  changedAtLabel,
  formatValue,
  diffRows,
  fieldName,
  fieldLabel,
  targetLabel,
  updatedFieldLabels = [],
  missingFieldLabels = [],
  reason,
  oldValue,
  newValue,
  showRawValues = false,
}: ChangeLogCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{actionLabel}</span>
          {targetLabel ? (
            <span className="text-xs text-muted-foreground">{targetLabel}</span>
          ) : null}
          {fieldLabel ? (
            <span className="text-xs text-muted-foreground">{fieldLabel}</span>
          ) : null}
        </div>
        {updatedFieldLabels.length ? (
          <p className="text-xs text-muted-foreground">
            変更項目: {updatedFieldLabels.join("、")}
          </p>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {actorLabel} / {changedAtLabel}
        </span>
        {reason ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            理由: {reason}
          </p>
        ) : null}
        {showRawValues ? (
          <div className="grid gap-2 md:grid-cols-2">
            <ChangeValue
              label="変更前"
              value={oldValue}
              fieldName={fieldName}
              formatValue={formatValue}
            />
            <ChangeValue
              label="変更後"
              value={newValue}
              fieldName={fieldName}
              formatValue={formatValue}
            />
          </div>
        ) : diffRows.length ? (
          <div className="flex flex-col gap-2">
            {diffRows.map((row) => (
              <div key={row.field} className="rounded-md bg-muted p-2">
                <div className="mb-2 text-xs font-medium">{row.label}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <FormattedValue label="変更前" value={row.oldValue} />
                  <FormattedValue label="変更後" value={row.newValue} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {missingFieldLabels.length
              ? `変更項目は記録されていますが、変更前後の値がレスポンスに含まれていません: ${missingFieldLabels.join("、")}`
              : "表示できる差分はありません。"}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeValue({
  label,
  value,
  fieldName,
  formatValue,
}: {
  label: string;
  value: unknown;
  fieldName?: string | null;
  formatValue: (value: unknown, fieldName?: string | null) => string;
}) {
  return (
    <FormattedValue
      label={label}
      value={formatValue(value, fieldName)}
    />
  );
}

function FormattedValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
        {value}
      </pre>
    </div>
  );
}
