const base = "https://syncnesto.invalid";
const positive = (value: string | null) =>
  value !== null && /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647
    ? Number(value)
    : null;

export function readTraceParams(params: Pick<URLSearchParams, "get">) {
  return {
    document: positive(params.get("traceDocument")),
    q: (params.get("traceQ") ?? "").slice(0, 200),
    status: (params.get("traceStatus") ?? "").slice(0, 50),
    page: positive(params.get("tracePage")) ?? 1,
    selected: positive(params.get("selectedRequirement")),
  };
}

const calendarDate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
};

export function readScheduleParams(params: Pick<URLSearchParams, "get">) {
  return {
    view:
      params.get("overviewView") === "schedule" ? "schedule" : "requirements",
    start: calendarDate(params.get("scheduleStart")),
    end: calendarDate(params.get("scheduleEnd")),
    page: positive(params.get("schedulePage")) ?? 1,
    commonPage: positive(params.get("commonPage")) ?? 1,
  };
}

export function safeOverviewReturn(
  candidate: string | null,
  projectId: number,
): string | null {
  if (
    !candidate ||
    candidate.length > 4096 ||
    /[\u0000-\u001f\\]/.test(candidate)
  )
    return null;
  if (!Number.isInteger(projectId) || projectId <= 0 || projectId > 2147483647)
    return null;
  try {
    const url = new URL(candidate, base);
    if (
      url.origin !== base ||
      url.username ||
      url.password ||
      url.pathname !== `/projects/joined/${projectId}`
    )
      return null;
    const values = readTraceParams(url.searchParams);
    const clean = new URLSearchParams();
    if (values.document) clean.set("traceDocument", String(values.document));
    if (values.q) clean.set("traceQ", values.q);
    if (values.status) clean.set("traceStatus", values.status);
    if (values.page !== 1) clean.set("tracePage", String(values.page));
    if (values.selected)
      clean.set("selectedRequirement", String(values.selected));
    const schedule = readScheduleParams(url.searchParams);
    if (schedule.view === "schedule") clean.set("overviewView", "schedule");
    if (schedule.start) clean.set("scheduleStart", schedule.start);
    if (schedule.end) clean.set("scheduleEnd", schedule.end);
    if (schedule.page !== 1) clean.set("schedulePage", String(schedule.page));
    if (schedule.commonPage !== 1)
      clean.set("commonPage", String(schedule.commonPage));
    return `${url.pathname}${clean.size ? `?${clean}` : ""}`;
  } catch {
    return null;
  }
}

export function withOverviewOrigin(
  href: string,
  projectId: number,
  candidate: string | null,
): string {
  const origin = safeOverviewReturn(candidate, projectId);
  if (!origin) return href;
  try {
    const url = new URL(href, base);
    const prefix = `/projects/joined/${projectId}`;
    if (url.origin !== base || !url.pathname.startsWith(`${prefix}/`))
      return href;
    const path = url.pathname.slice(prefix.length);
    if (
      !/^\/(?:requirements\/[1-9]\d*\/items\/[1-9]\d*|tasks(?:\/[1-9]\d*)?|specifications\/[1-9]\d*|test-designs\/[1-9]\d*|fixed-approvals(?:\/[a-f0-9-]{36})?)$/.test(
        path,
      )
    )
      return href;
    url.searchParams.set("overviewReturn", origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
