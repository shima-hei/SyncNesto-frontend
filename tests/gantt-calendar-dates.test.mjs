import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadUrl(path, imports = {}) {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  );
  const source = Object.entries(imports).reduce(
    (source, [specifier, url]) =>
      source.replace(JSON.stringify(specifier), JSON.stringify(url)),
    outputText,
  );
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

const dateModule = loadUrl("../lib/format/date.ts");
const { formatDate, toCalendarDate, toCalendarDateInput } = await import(
  dateModule
);
const timeline = await import(
  loadUrl("../features/tasks/lib/gantt-timeline.ts", {
    "@/lib/format/date": dateModule,
  })
);
const controls = await import(
  loadUrl("../features/tasks/lib/gantt-range-controls.ts", {
    "@/lib/format/date": dateModule,
  })
);

const timelineElement = {
  getBoundingClientRect: () => ({ left: 0, width: 400 }),
};

for (const tz of ["Asia/Tokyo", "UTC", "America/Los_Angeles"]) {
  test(`keeps labels, resizing and calendar display aligned in ${tz}`, (context) => {
    const previous = process.env.TZ;
    context.after(() => {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    });
    process.env.TZ = tz;

    for (const dates of [
      ["2026-11-15", "2026-11-16", "2026-11-17"],
      ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"],
      ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"],
      ["2026-12-31", "2027-01-01"],
      ["2028-02-29"],
    ]) {
      const start = dates[0];
      const end = dates.at(-1);
      const range = timeline.getDateRange(
        [{ start_date: start, due_date: end }],
        [],
      );
      assert.deepEqual(
        timeline.getDateCells(range).map((cell) => cell.key),
        dates,
      );
      assert.equal(timeline.getInclusiveDays(range), dates.length);
      const left = timeline.getClientDate(0, range, timelineElement);
      const right = timeline.getClientDate(400, range, timelineElement);
      const drag = {
        anchorDate: start,
        originalStartDate: start,
        originalDueDate: end,
      };
      assert.deepEqual(
        timeline.getDraggedDateRange({ ...drag, mode: "start" }, left),
        { startDate: start, dueDate: end },
      );
      assert.deepEqual(
        timeline.getDraggedDateRange({ ...drag, mode: "end" }, right),
        { startDate: start, dueDate: end },
      );
      const moved = timeline.getDraggedDateRange(
        { ...drag, mode: "move" },
        right,
      );
      assert.equal(moved.startDate, end);
      assert.equal(
        timeline.daysBetween(
          new Date(moved.startDate),
          new Date(moved.dueDate),
        ),
        dates.length - 1,
      );
    }
    assert.equal(formatDate("2026-11-15"), "2026/11/15");
    const localLateEvening = new Date(2026, 10, 15, 23, 59);
    assert.equal(
      toCalendarDateInput(toCalendarDate(localLateEvening)),
      "2026-11-15",
    );
    assert.equal(
      formatDate(localLateEvening.toISOString()),
      new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
        localLateEvening,
      ),
    );
  });
}

test("keeps range paging in the target month at month and quarter boundaries", () => {
  const range = controls.getCurrentGanttRange(
    "2028-01-31",
    "2028-02-29",
    "month",
  );
  assert.deepEqual(controls.moveGanttRange(range, "month", 1), {
    startDate: "2028-02-29",
    endDate: "2028-03-29",
  });
  assert.deepEqual(controls.moveGanttRange(range, "quarter", 1), {
    startDate: "2028-04-30",
    endDate: "2028-05-29",
  });
});

test("timeline period headings span real days without repeating labels", () => {
  const ranges = [
    [
      "week",
      "2026-11-14",
      "2026-11-23",
      [1, 7, 2],
      ["2026-11-08", "2026-11-15", "2026-11-22"],
    ],
    ["month", "2028-02-28", "2028-03-02", [2, 2], ["2028-02-01", "2028-03-01"]],
    [
      "quarter",
      "2026-12-30",
      "2027-01-02",
      [2, 2],
      ["2026-10-01", "2027-01-01"],
    ],
  ];
  for (const [unit, start, end, spans, keys] of ranges) {
    const range = timeline.getDateRange(
      [{ start_date: start, due_date: end }],
      [],
    );
    const headers = timeline.getGanttPeriodHeaders(range, unit);
    assert.deepEqual(
      headers.map(({ days }) => days),
      spans,
    );
    assert.deepEqual(
      headers.map(({ key }) => key),
      keys,
    );
    assert.equal(
      spans.reduce((sum, days) => sum + days, 0),
      timeline.getInclusiveDays(range),
    );
  }
});

test("explicit display bounds retain dates beyond the last task and clip bars to their real overlap", () => {
  const observed = timeline.getDateRange(
    [{ start_date: "2026-11-13", due_date: "2026-11-19" }],
    [],
  );
  const fallback = { startDate: "2026-11-10", endDate: "2026-12-08" };
  const range = timeline.getGanttDisplayRange(
    observed,
    "2026-11-15",
    "2026-11-25",
    fallback,
  );
  assert.equal(toCalendarDateInput(range.end), "2026-11-25");
  assert.deepEqual(
    timeline.getTimelineBarStyle(observed.start, observed.end, range),
    {
      left: "0%",
      width: `${(5 / 11) * 100}%`,
    },
  );
  assert.equal(
    timeline.getTimelineBarStyle(
      new Date("2026-12-01"),
      new Date("2026-12-03"),
      range,
    ),
    null,
  );
  const defaultRange = timeline.getGanttDisplayRange(
    observed,
    "",
    "",
    fallback,
  );
  assert.equal(toCalendarDateInput(defaultRange.end), fallback.endDate);
});
