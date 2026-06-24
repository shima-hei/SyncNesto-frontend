"use client";

import { useState } from "react";

import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskChangeLogRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useTaskChangeLogs } from "../../hooks/use-task-change-logs";

type TaskChangeLogsSectionProps = {
  taskId: number;
};

export function TaskChangeLogsSection({ taskId }: TaskChangeLogsSectionProps) {
  const [page, setPage] = useState(1);
  const {
    changeLogs,
    total,
    pageSize,
    isLoading,
    isFetching,
  } = useTaskChangeLogs(taskId, page);

  return (
    <Card>
      <CardHeader>
        <CardTitle>変更履歴</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">変更履歴を読み込み中です。</p>
        ) : changeLogs.length ? (
          <div className="flex flex-col gap-3">
            {changeLogs.map((changeLog) => (
              <TaskChangeLogItem key={changeLog.id} changeLog={changeLog} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">変更履歴はありません。</p>
        )}

        <DataPagination
          page={page}
          pageSize={pageSize}
          total={total}
          currentCount={changeLogs.length}
          isFetching={isFetching}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function TaskChangeLogItem({
  changeLog,
}: {
  changeLog: TaskChangeLogRead;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{changeLog.action}</span>
          {changeLog.field_name ? (
            <span className="text-xs text-muted-foreground">
              {changeLog.field_name}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          変更者ID: {changeLog.created_by ?? "-"} /{" "}
          {formatDateTime(changeLog.created_at)}
        </span>
        {changeLog.reason ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            理由: {changeLog.reason}
          </p>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          <ChangeValue label="変更前" value={changeLog.old_value} />
          <ChangeValue label="変更後" value={changeLog.new_value} />
        </div>
      </div>
    </div>
  );
}

function ChangeValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
        {formatChangeValue(value)}
      </pre>
    </div>
  );
}

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

  return JSON.stringify(value, null, 2);
};
