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

export const getTodayGanttRange = (displayUnit: string) => {
  const today = new Date();
  const days = getGanttWindowDays(displayUnit);
  const start = addDays(today, -Math.floor(days / 3));
  const end = addDays(start, days);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

export const moveGanttRange = (
  range: { start: Date; end: Date },
  displayUnit: string,
  direction: -1 | 1,
) => {
  if (displayUnit === "month") {
    return {
      startDate: toDateInputValue(addMonths(range.start, direction)),
      endDate: toDateInputValue(addMonths(range.end, direction)),
    };
  }

  if (displayUnit === "quarter") {
    return {
      startDate: toDateInputValue(addMonths(range.start, direction * 3)),
      endDate: toDateInputValue(addMonths(range.end, direction * 3)),
    };
  }

  const days = getGanttWindowDays(displayUnit) * direction;

  return {
    startDate: toDateInputValue(addDays(range.start, days)),
    endDate: toDateInputValue(addDays(range.end, days)),
  };
};

const getGanttWindowDays = (displayUnit: string) => {
  switch (displayUnit) {
    case "week":
      return 28;
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

  next.setDate(next.getDate() + days);

  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);

  next.setMonth(next.getMonth() + months);

  return next;
};

const toDateInputValue = (date: Date) => {
  return date.toISOString().slice(0, 10);
};
