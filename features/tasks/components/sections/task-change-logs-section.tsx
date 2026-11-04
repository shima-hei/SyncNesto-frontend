"use client";

import { useState } from "react";

import { ChangeLogCard } from "@/components/shared/change-log/change-log-card";
import { ChangeLogListCard } from "@/components/shared/change-log/change-log-list-card";
import {
  getChangeLogHeaderFieldLabel,
  getVisibleChangeLogs,
} from "@/lib/change-log/display";
import type { TaskChangeLogRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useTaskChangeLogs } from "../../hooks/use-task-change-logs";
import { useTaskTypes } from "../../hooks/use-task-types";
import {
  formatTaskChangeLogAction,
  formatTaskChangeLogActor,
  formatTaskChangeLogField,
  formatTaskChangeLogValue,
  getTaskChangeLogMissingSnapshotFieldLabels,
  getTaskChangeLogSnapshotDiffRows,
  getTaskChangeLogUpdatedFieldLabels,
  getTaskChangeLogValueDisplayMode,
} from "../../lib/task-change-log-format";

type TaskChangeLogsSectionProps = {
  taskId: number;
};

export function TaskChangeLogsSection({ taskId }: TaskChangeLogsSectionProps) {
  const [page, setPage] = useState(1);
  const { name: typeName } = useTaskTypes();
  const { changeLogs, total, pageSize, isLoading, isFetching } =
    useTaskChangeLogs(taskId, page);
  const visibleChangeLogs = getVisibleChangeLogs(changeLogs);

  return (
    <ChangeLogListCard
      title="変更履歴"
      items={visibleChangeLogs}
      isLoading={isLoading}
      renderItem={(changeLog) => (
        <TaskChangeLogItem
          key={changeLog.id}
          changeLog={changeLog}
          typeName={typeName}
        />
      )}
      pagination={{
        page,
        pageSize,
        total,
        currentCount: visibleChangeLogs.length,
        isFetching,
        onPageChange: setPage,
      }}
    />
  );
}

function TaskChangeLogItem({
  changeLog,
  typeName,
}: {
  changeLog: TaskChangeLogRead;
  typeName: (key: string) => string;
}) {
  const formatValue = (value: unknown, fieldName?: string | null) =>
    fieldName === "task_type" && typeof value === "string" && value
      ? typeName(value)
      : formatTaskChangeLogValue(value, fieldName);
  const updatedFieldLabels = getTaskChangeLogUpdatedFieldLabels(changeLog);
  const snapshotDiffRows = getTaskChangeLogSnapshotDiffRows(
    changeLog,
    formatValue,
  );
  const missingSnapshotFieldLabels =
    getTaskChangeLogMissingSnapshotFieldLabels(changeLog);
  const headerFieldLabel = getChangeLogHeaderFieldLabel(
    changeLog.field_name,
    updatedFieldLabels,
    snapshotDiffRows.length,
    formatTaskChangeLogField,
  );

  return (
    <ChangeLogCard
      actionLabel={formatTaskChangeLogAction(changeLog.action)}
      actorLabel={formatTaskChangeLogActor(changeLog)}
      changedAtLabel={formatDateTime(changeLog.created_at)}
      fieldName={changeLog.field_name}
      fieldLabel={headerFieldLabel}
      updatedFieldLabels={updatedFieldLabels}
      reason={changeLog.reason}
      oldValue={changeLog.old_value}
      newValue={changeLog.new_value}
      valueDisplayMode={getTaskChangeLogValueDisplayMode(changeLog.action)}
      showRawValues={shouldShowChangeValues(changeLog)}
      diffRows={snapshotDiffRows}
      missingFieldLabels={missingSnapshotFieldLabels}
      formatValue={formatValue}
    />
  );
}

const shouldShowChangeValues = (changeLog: TaskChangeLogRead) => {
  return Boolean(changeLog.field_name);
};
