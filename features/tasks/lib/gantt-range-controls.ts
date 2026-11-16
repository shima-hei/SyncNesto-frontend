import { toCalendarDate, toCalendarDateInput } from "@/lib/format/date";

export const getCurrentGanttRange = (
  startDate: string,
  endDate: string,
  displayUnit: string,
) => {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  const todayRange = getTodayGanttRange(displayUnit);

  return {
    start: new Date(todayRange.startDate),
    end: new Date(todayRange.endDate),
  };
};

export const getTodayGanttRange = (displayUnit: string, now = new Date()) => {
  const today = toCalendarDate(now);
  if (displayUnit === "day" || displayUnit === "week") {
    const start = new Date(today);
    start.setUTCDate(1);
    const end = new Date(start);
    end.setUTCMonth(start.getUTCMonth() + 3, 0);
    return {
      startDate: toCalendarDateInput(start),
      endDate: toCalendarDateInput(end),
    };
  }
  const days = getGanttWindowDays(displayUnit);
  const start = addDays(today, -Math.floor(days / 3));
  const end = addDays(start, days);

  return {
    startDate: toCalendarDateInput(start),
    endDate: toCalendarDateInput(end),
  };
};

export const moveGanttRange = (
  range: { start: Date; end: Date },
  displayUnit: string,
  direction: -1 | 1,
) => {
  if (displayUnit === "month") {
    return {
      startDate: toCalendarDateInput(addMonths(range.start, direction)),
      endDate: toCalendarDateInput(addMonths(range.end, direction)),
    };
  }

  if (displayUnit === "quarter") {
    return {
      startDate: toCalendarDateInput(addMonths(range.start, direction * 3)),
      endDate: toCalendarDateInput(addMonths(range.end, direction * 3)),
    };
  }

  const days =
    (Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1) *
    direction;

  return {
    startDate: toCalendarDateInput(addDays(range.start, days)),
    endDate: toCalendarDateInput(addDays(range.end, days)),
  };
};

const getGanttWindowDays = (displayUnit: string) => {
  switch (displayUnit) {
    case "month":
      return 120;
    case "quarter":
      return 365;
    case "day":
    default:
      return 21;
  }
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);

  next.setUTCDate(next.getUTCDate() + days);

  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);

  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months + 1, 0);
  next.setUTCDate(Math.min(day, next.getUTCDate()));

  return next;
};
