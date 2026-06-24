import { areChangeLogValuesEqual } from "./compare";

type ChangeLogBase = {
  id: number;
  action: string;
  field_name?: string | null;
  old_value?: unknown;
  new_value?: unknown;
};

export const getChangeLogHeaderFieldLabel = (
  fieldName: string | null | undefined,
  updatedFieldLabels: string[],
  diffRowCount: number,
  formatField: (fieldName: string) => string
) => {
  if (fieldName) {
    return formatField(fieldName);
  }

  return updatedFieldLabels.length > 1 || diffRowCount > 1 ? "複数項目" : null;
};

export const getVisibleChangeLogs = <TChangeLog extends ChangeLogBase>(
  changeLogs: TChangeLog[]
) => {
  return changeLogs.filter((changeLog) => {
    return !areChangeLogValuesEqual(changeLog.old_value, changeLog.new_value);
  });
};

export const getVisibleTaskLikeChangeLogs = <TChangeLog extends ChangeLogBase>(
  changeLogs: TChangeLog[]
) => {
  const changedLogs = getVisibleChangeLogs(changeLogs);

  return changedLogs.filter((changeLog) => {
    if (changeLog.action !== "updated" || !changeLog.field_name) {
      return true;
    }

    return !changedLogs.some(
      (otherLog) =>
        otherLog.id !== changeLog.id &&
        otherLog.action !== "updated" &&
        otherLog.field_name === changeLog.field_name &&
        areChangeLogValuesEqual(otherLog.old_value, changeLog.old_value) &&
        areChangeLogValuesEqual(otherLog.new_value, changeLog.new_value)
    );
  });
};
