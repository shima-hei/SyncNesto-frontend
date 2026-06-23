"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementChangeLogRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useRequirementChangeLogs } from "../../hooks/use-requirement-change-logs";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementChangeLogsSectionProps = {
  projectId: number;
  documentId: number;
  title?: string;
  targetType?: string;
  targetId?: number;
};

export function RequirementChangeLogsSection({
  projectId,
  documentId,
  title = "変更履歴",
  targetType,
  targetId,
}: RequirementChangeLogsSectionProps) {
  const { changeLogs, isLoading } = useRequirementChangeLogs(
    projectId,
    documentId,
    { targetType, targetId }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : changeLogs.length ? (
          <div className="flex flex-col gap-3">
            {changeLogs.map((changeLog) => (
              <ChangeLogItem key={changeLog.id} changeLog={changeLog} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            変更履歴はありません。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChangeLogItem({
  changeLog,
}: {
  changeLog: RequirementChangeLogRead;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{changeLog.action}</span>
          <span className="text-xs text-muted-foreground">
            {changeLog.target_type} #{changeLog.target_id}
          </span>
          {changeLog.field_name ? (
            <span className="text-xs text-muted-foreground">
              {changeLog.field_name}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          変更者ID: {changeLog.changed_by ?? "-"} /{" "}
          {formatDateTime(changeLog.changed_at)}
        </span>
        {changeLog.reason ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            理由: {changeLog.reason}
          </p>
        ) : null}
        <ChangeDiff oldValue={changeLog.old_value} newValue={changeLog.new_value} />
        <div className="grid gap-2 md:grid-cols-2">
          <ChangeValue label="変更前" value={changeLog.old_value} />
          <ChangeValue label="変更後" value={changeLog.new_value} />
        </div>
      </div>
    </div>
  );
}

function ChangeDiff({
  oldValue,
  newValue,
}: {
  oldValue: unknown;
  newValue: unknown;
}) {
  const rows = getChangeDiffRows(oldValue, newValue);

  if (!rows.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="mb-2 text-xs font-medium">差分</div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-1 text-xs md:grid-cols-[120px_1fr]">
            <span className="text-muted-foreground">{row.key}</span>
            <div className="grid gap-1 md:grid-cols-2">
              <span className="rounded bg-muted px-2 py-1 text-muted-foreground line-through">
                {row.oldValue}
              </span>
              <span className="rounded bg-muted px-2 py-1">{row.newValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
        {value ? JSON.stringify(value, null, 2) : "-"}
      </pre>
    </div>
  );
}

const getChangeDiffRows = (oldValue: unknown, newValue: unknown) => {
  if (!isPlainRecord(oldValue) || !isPlainRecord(newValue)) {
    if (formatChangeValue(oldValue) === formatChangeValue(newValue)) {
      return [];
    }

    return [
      {
        key: "値",
        oldValue: formatChangeValue(oldValue),
        newValue: formatChangeValue(newValue),
      },
    ];
  }

  const keys = Array.from(
    new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  );

  return keys
    .map((key) => ({
      key,
      oldValue: formatChangeValue(oldValue[key]),
      newValue: formatChangeValue(newValue[key]),
    }))
    .filter((row) => row.oldValue !== row.newValue);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const formatChangeValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return JSON.stringify(value);
};
