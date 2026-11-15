import type { MilestoneRead, TaskRead } from "@/lib/api/generated/model";
import { toCalendarDate, toCalendarDateInput } from "@/lib/format/date";

// ガント内の Date は暦日の UTC 0時として保持する。
export type DateRange = {
  start: Date;
  end: Date;
  labels: string[];
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
  displayUnit: GanttDisplayUnit,
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
  const labels = getDateLabels(start, end, displayUnit);

  return { start, end, labels };
};

export const getFallbackDateRange = (
  displayUnit: GanttDisplayUnit,
): DateRange => {
  const start = toCalendarDate(new Date());
  const end = new Date(start);
  const days = {
    day: 30,
    week: 84,
    month: 180,
    quarter: 365,
  }[displayUnit];

  end.setUTCDate(start.getUTCDate() + days);

  return {
    start,
    end,
    labels: getDateLabels(start, end, displayUnit),
  };
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
      return Math.max(640, Math.ceil(days / 7) * 120);
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
  const offset = Math.max(daysBetween(range.start, start), 0);
  const duration = Math.max(daysBetween(start, end) + 1, 1);

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

const getDateLabels = (
  start: Date,
  end: Date,
  displayUnit: GanttDisplayUnit,
) => {
  const rangeDays = daysBetween(start, end);
  const labelCount = Math.min(getLabelCount(displayUnit), rangeDays + 1);

  return Array.from({ length: labelCount }).map((_, index) => {
    const date = new Date(start);
    date.setUTCDate(
      start.getUTCDate() +
        Math.round((rangeDays / Math.max(labelCount - 1, 1)) * index),
    );

    switch (displayUnit) {
      case "week":
        return `${date.getUTCFullYear()}/W${getWeekNumber(date)}`;
      case "month":
        return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
      case "quarter":
        return `${date.getUTCFullYear()}/Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
      case "day":
      default:
        return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    }
  });
};

const getLabelCount = (displayUnit: GanttDisplayUnit) => {
  switch (displayUnit) {
    case "month":
      return 6;
    case "quarter":
      return 4;
    case "week":
    case "day":
    default:
      return 7;
  }
};

const getWeekNumber = (date: Date) => {
  const firstDay = new Date(date);
  firstDay.setUTCMonth(0, 1);
  const days = daysBetween(firstDay, date);

  return Math.ceil((days + firstDay.getUTCDay() + 1) / 7);
};
