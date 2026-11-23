import type { ChangeLogDiffRow } from "@/lib/change-log/diff";

export type ChangeLogValueDisplayMode = "created" | "updated" | "deleted";

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
  valueDisplayMode?: ChangeLogValueDisplayMode;
  showRawValues?: boolean;
  compact?: boolean;
  changedAt?: string;
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
  valueDisplayMode = "updated",
  showRawValues = false,
  compact = false,
  changedAt,
}: ChangeLogCardProps) {
  const valueLabels = getChangeLogValueLabels(valueDisplayMode);

  const values = showRawValues ? (
    <ChangeValuePair
      oldLabel={valueLabels.oldLabel}
      newLabel={valueLabels.newLabel}
      oldValue={oldValue}
      newValue={newValue}
      fieldName={fieldName}
      formatValue={formatValue}
    />
  ) : diffRows.length ? (
    <ChangeLogDiffRows
      rows={diffRows}
      oldLabel={valueLabels.oldLabel}
      newLabel={valueLabels.newLabel}
    />
  ) : (
    <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
      {missingFieldLabels.length
        ? `変更項目は記録されていますが、変更前後の値がレスポンスに含まれていません: ${missingFieldLabels.join("、")}`
        : "表示できる差分はありません。"}
    </div>
  );
  if (compact) {
    return (
      <li className="relative border-s py-2 ps-4 before:absolute before:start-[-0.2rem] before:top-4 before:size-1.5 before:rounded-full before:bg-muted-foreground">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <time
            className="text-xs tabular-nums text-muted-foreground"
            dateTime={changedAt}
          >
            {changedAtLabel}
          </time>
          <span className="text-xs text-muted-foreground">{actorLabel}</span>
          <span className="font-medium">{actionLabel}</span>
          {fieldLabel && (
            <span className="text-xs text-muted-foreground">{fieldLabel}</span>
          )}
        </div>
        {updatedFieldLabels.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {updatedFieldLabels.join("、")}
          </p>
        )}
        {(showRawValues ||
          diffRows.length > 0 ||
          missingFieldLabels.length > 0 ||
          reason) && (
          <details className="mt-1 text-xs">
            <summary className="w-fit cursor-pointer text-muted-foreground">
              変更内容を表示
            </summary>
            <div className="mt-2 space-y-2">
              {reason && (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {reason}
                </p>
              )}
              {values}
            </div>
          </details>
        )}
      </li>
    );
  }

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
        {values}
      </div>
    </div>
  );
}

export function ChangeLogDiffRows({
  rows,
  oldLabel = "変更前",
  newLabel = "変更後",
}: {
  rows: ChangeLogDiffRow[];
  oldLabel?: string | null;
  newLabel?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.field} className="rounded-md bg-muted p-2">
          <div className="mb-2 text-xs font-medium">{row.label}</div>
          <FormattedValuePair
            oldLabel={oldLabel}
            newLabel={newLabel}
            oldValue={row.oldValue}
            newValue={row.newValue}
          />
        </div>
      ))}
    </div>
  );
}

function ChangeValuePair({
  oldLabel,
  newLabel,
  oldValue,
  newValue,
  fieldName,
  formatValue,
}: {
  oldLabel: string | null;
  newLabel: string | null;
  oldValue: unknown;
  newValue: unknown;
  fieldName?: string | null;
  formatValue: (value: unknown, fieldName?: string | null) => string;
}) {
  return (
    <FormattedValuePair
      oldLabel={oldLabel}
      newLabel={newLabel}
      oldValue={formatValue(oldValue, fieldName)}
      newValue={formatValue(newValue, fieldName)}
    />
  );
}

function FormattedValuePair({
  oldLabel,
  newLabel,
  oldValue,
  newValue,
}: {
  oldLabel: string | null;
  newLabel: string | null;
  oldValue: string;
  newValue: string;
}) {
  if (!oldLabel && !newLabel) {
    return null;
  }

  const isPair = Boolean(oldLabel && newLabel);

  return (
    <div className={isPair ? "grid gap-2 md:grid-cols-2" : "grid gap-2"}>
      {oldLabel ? <FormattedValue label={oldLabel} value={oldValue} /> : null}
      {newLabel ? <FormattedValue label={newLabel} value={newValue} /> : null}
    </div>
  );
}

function getChangeLogValueLabels(mode: ChangeLogValueDisplayMode) {
  switch (mode) {
    case "created":
      return { oldLabel: null, newLabel: "作成時の値" };
    case "deleted":
      return { oldLabel: "削除前の値", newLabel: null };
    case "updated":
      return { oldLabel: "変更前", newLabel: "変更後" };
  }
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
