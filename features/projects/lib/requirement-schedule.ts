const day = 86_400_000;
const time = (value: string) => Date.parse(`${value}T00:00:00Z`);
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);

export function scheduleWeeks(start: string, end: string) {
  const result: string[] = [];
  for (let t = time(start); t <= time(end) && result.length < 12; t += 7 * day)
    result.push(iso(t));
  return result;
}

export function shiftScheduleWindow(
  start: string,
  end: string,
  direction: number,
) {
  const delta = (time(end) - time(start) + day) * direction;
  const a = iso(time(start) + delta);
  const b = iso(time(end) + delta);
  return /^\d{4}-\d{2}-\d{2}$/.test(a) &&
    /^\d{4}-\d{2}-\d{2}$/.test(b) &&
    !a.startsWith("0000")
    ? { start: a, end: b }
    : null;
}

export function schedulePlacement(
  start: string | null,
  end: string | null,
  from: string,
  to: string,
) {
  if (!start || !end) return { label: "期間未確定", column: null };
  if (end < start) return { label: "日程を確認", column: null };
  if (end < from) return { label: "表示期間より前", column: null };
  if (start > to) return { label: "表示期間より後", column: null };
  const first = Math.max(0, Math.floor((time(start) - time(from)) / day / 7));
  const last = Math.min(
    Math.ceil((time(to) - time(from) + day) / day / 7),
    Math.floor((time(end) - time(from)) / day / 7) + 1,
  );
  return { label: "予定", column: `${first + 1} / ${last + 1}` };
}
