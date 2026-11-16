import type { MilestoneRead, TaskRead } from "@/lib/api/generated/model";
import { toCalendarDate, toCalendarDateInput } from "@/lib/format/date";

// ガント内の Date は暦日の UTC 0時として保持する。
export type DateRange = {
  start: Date;
  end: Date;
};

export type GanttGridStyle = {
  gridTemplateColumns: string;
};

export type GanttDisplayUnit = "day" | "week" | "month" | "quarter";
export type GanttDragMode = "move" | "start" | "end";

export type GanttDragState = {
  mode: GanttDragMode;
  anchorDate: string;
  originalStartDate: string;
  originalDueDate: string;
};

export const GANTT_TASK_COLUMN_WIDTH = 320;

export const getDateRange = (
  tasks: TaskRead[],
  milestones: MilestoneRead[],
): DateRange | null => {
  const taskTimestamps = tasks
    .flatMap((task) => [
      task.start_date,
      task.due_date,
      task.actual_start_date,
      task.actual_end_date,
    ])
    .filter(Boolean)
    .map((value) => new Date(String(value)).getTime());
  const milestoneTimestamps = milestones.map((milestone) =>
    new Date(milestone.target_date).getTime(),
  );
  const timestamps = [...taskTimestamps, ...milestoneTimestamps];

  if (!timestamps.length) {
    return null;
  }

  const start = new Date(Math.min(...timestamps));
  const end = new Date(Math.max(...timestamps));
  return { start, end };
};

export const getGanttDisplayRange = (
  observed: DateRange | null,
  startDate: string,
  endDate: string,
  fallback: { startDate: string; endDate: string },
): DateRange => {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) &&
      toCalendarDateInput(date) === value
      ? date
      : null;
  };
  const fallbackStart = new Date(fallback.startDate);
  const fallbackEnd = new Date(fallback.endDate);
  const requestedStart = parse(startDate);
  const requestedEnd = parse(endDate);
  const span = fallbackEnd.getTime() - fallbackStart.getTime();
  let start =
    requestedStart ??
    (observed && observed.start < fallbackStart
      ? observed.start
      : fallbackStart);
  let end =
    requestedEnd ??
    (observed && observed.end > fallbackEnd ? observed.end : fallbackEnd);
  if (requestedStart && !requestedEnd)
    end = new Date(Math.max(end.getTime(), start.getTime() + span));
  if (requestedEnd && !requestedStart)
    start = new Date(Math.min(start.getTime(), end.getTime() - span));
  return { start, end: end < start ? start : end };
};

export const getTimelineWidth = (
  range: DateRange,
  displayUnit: GanttDisplayUnit,
) => {
  const days = Math.max(daysBetween(range.start, range.end) + 1, 1);

  switch (displayUnit) {
    case "quarter":
      return Math.max(640, Math.ceil(days / 91) * 220);
    case "month":
      return Math.max(640, Math.ceil(days / 30) * 160);
    case "week":
      return Math.max(640, days * 22);
    case "day":
    default:
      return Math.max(640, days * 28);
  }
};

export const getDateCells = (range: DateRange) => {
  const cells: Array<{
    key: string;
    date: Date;
    isMonthStart: boolean;
    showMonthLabel: boolean;
    isWeekend: boolean;
    isToday: boolean;
  }> = [];
  const date = new Date(range.start);
  const today = toCalendarDate(new Date());

  while (date <= range.end) {
    const cellDate = new Date(date);
    const isMonthStart = cellDate.getUTCDate() === 1;

    cells.push({
      key: toCalendarDateInput(cellDate),
      date: cellDate,
      isMonthStart,
      showMonthLabel: isMonthStart || cells.length === 0,
      isWeekend: cellDate.getUTCDay() === 0 || cellDate.getUTCDay() === 6,
      isToday: toCalendarDateInput(cellDate) === toCalendarDateInput(today),
    });

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return cells;
};

export const getGanttPeriodHeaders = (
  range: DateRange,
  displayUnit: Exclude<GanttDisplayUnit, "day">,
) => {
  const headers: { key: string; label: string; days: number }[] = [];
  let cursor = new Date(range.start);
  while (cursor <= range.end) {
    const periodStart = new Date(cursor);
    if (displayUnit === "week") {
      periodStart.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
    } else {
      periodStart.setUTCDate(1);
      if (displayUnit === "quarter")
        periodStart.setUTCMonth(Math.floor(cursor.getUTCMonth() / 3) * 3);
    }
    const next = new Date(periodStart);
    if (displayUnit === "week") next.setUTCDate(next.getUTCDate() + 7);
    else
      next.setUTCMonth(next.getUTCMonth() + (displayUnit === "month" ? 1 : 3));

    const month = periodStart.getUTCMonth() + 1;
    const year = periodStart.getUTCFullYear();
    const label =
      displayUnit === "week"
        ? `${month}/${periodStart.getUTCDate()}の週`
        : displayUnit === "month"
          ? `${year}年${month}月`
          : `${year}年 第${Math.floor((month - 1) / 3) + 1}四半期`;
    headers.push({
      key: toCalendarDateInput(periodStart),
      label,
      days: Math.min(
        daysBetween(cursor, next),
        daysBetween(cursor, range.end) + 1,
      ),
    });
    cursor = next;
  }
  return headers;
};

export const daysBetween = (start: Date, end: Date) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return (end.getTime() - start.getTime()) / millisecondsPerDay;
};

export const getInclusiveDays = (range: DateRange) => {
  return Math.max(daysBetween(range.start, range.end) + 1, 1);
};

export const getPointerDate = (
  event: React.PointerEvent<HTMLElement>,
  range: DateRange,
  timeline: HTMLDivElement | null,
) => {
  if (!timeline) {
    return null;
  }

  return getClientDate(event.clientX, range, timeline);
};

export const getClientDate = (
  clientX: number,
  range: DateRange,
  timeline: HTMLElement | null,
) => {
  if (!timeline) {
    return null;
  }

  const rect = timeline.getBoundingClientRect();
  if (rect.width <= 0) return null;

  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const totalDays = getInclusiveDays(range);
  const dayOffset = Math.min(Math.floor(ratio * totalDays), totalDays - 1);
  const date = new Date(range.start);

  date.setUTCDate(range.start.getUTCDate() + dayOffset);

  return date;
};

export const getDraggedDateRange = (
  state: GanttDragState,
  pointedDate: Date,
) => {
  if (state.mode === "start") {
    return {
      startDate: minDateInput(pointedDate, state.originalDueDate),
      dueDate: state.originalDueDate,
    };
  }

  if (state.mode === "end") {
    return {
      startDate: state.originalStartDate,
      dueDate: maxDateInput(pointedDate, state.originalStartDate),
    };
  }

  const deltaDays = daysBetween(new Date(state.anchorDate), pointedDate);

  return {
    startDate: shiftDateInput(state.originalStartDate, deltaDays),
    dueDate: shiftDateInput(state.originalDueDate, deltaDays),
  };
};

export const isScheduleDirty = (
  task: TaskRead,
  startDate: string,
  dueDate: string,
) => {
  return (
    startDate !== (task.start_date ?? "") || dueDate !== (task.due_date ?? "")
  );
};

export const getTimelineBarStyle = (
  start: Date,
  end: Date,
  range: DateRange,
) => {
  const totalDays = getInclusiveDays(range);
  if (end < range.start || start > range.end) return null;
  const clippedStart = start < range.start ? range.start : start;
  const clippedEnd = end > range.end ? range.end : end;
  const offset = daysBetween(range.start, clippedStart);
  const duration = Math.max(daysBetween(clippedStart, clippedEnd) + 1, 1);

  return {
    left: `${Math.min((offset / totalDays) * 100, 100)}%`,
    width: `${Math.min((duration / totalDays) * 100, 100)}%`,
  };
};

export const getActualBarStyle = (task: TaskRead, range: DateRange) => {
  if (!task.actual_start_date && !task.actual_end_date) {
    return null;
  }

  const actualStart = task.actual_start_date
    ? new Date(task.actual_start_date)
    : task.actual_end_date
      ? new Date(task.actual_end_date)
      : range.start;
  const actualEnd = task.actual_end_date
    ? new Date(task.actual_end_date)
    : actualStart;

  return getTimelineBarStyle(actualStart, actualEnd, range);
};

export const getWeekendBands = (range: DateRange) => {
  const totalDays = getInclusiveDays(range);
  const bands: Array<{ key: string; left: string; width: string }> = [];
  const date = new Date(range.start);

  while (date <= range.end) {
    const day = date.getUTCDay();

    if (day === 0 || day === 6) {
      const offset = Math.max(daysBetween(range.start, date), 0);
      const key = toCalendarDateInput(date);

      bands.push({
        key,
        left: `${(offset / totalDays) * 100}%`,
        width: `${(1 / totalDays) * 100}%`,
      });
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return bands;
};

export const getDateColumnStyle = (dateInput: string, range: DateRange) => {
  const totalDays = getInclusiveDays(range);
  const date = new Date(dateInput);
  const offset = Math.min(
    Math.max(daysBetween(range.start, date), 0),
    totalDays - 1,
  );

  return {
    left: `${(offset / totalDays) * 100}%`,
    width: `${(1 / totalDays) * 100}%`,
  };
};

export const getTodayLeft = (range: DateRange) => {
  const today = toCalendarDate(new Date());

  if (today < range.start || today > range.end) {
    return null;
  }

  const totalDays = getInclusiveDays(range);
  const offset = Math.max(daysBetween(range.start, today), 0);

  return `${Math.min((offset / totalDays) * 100, 100)}%`;
};

export const getMilestoneLeft = (
  milestone: MilestoneRead,
  range: DateRange,
) => {
  const targetDate = new Date(milestone.target_date);
  const totalDays = getInclusiveDays(range);
  const offset = Math.max(daysBetween(range.start, targetDate), 0);

  return `${Math.min((offset / totalDays) * 100, 100)}%`;
};

const shiftDateInput = (dateInput: string, days: number) => {
  const date = new Date(dateInput);

  date.setUTCDate(date.getUTCDate() + days);

  return toCalendarDateInput(date);
};

const minDateInput = (date: Date, maxDateInput: string) => {
  const maxDate = new Date(maxDateInput);

  return toCalendarDateInput(date > maxDate ? maxDate : date);
};

const maxDateInput = (date: Date, minDateInput: string) => {
  const minDate = new Date(minDateInput);

  return toCalendarDateInput(date < minDate ? minDate : date);
};
