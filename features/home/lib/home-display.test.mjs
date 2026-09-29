import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCalendarDate,
  homeDueState,
  homeTaskHref,
} from "./home-display.ts";

test("calendar dates retain their day in negative-offset browser environments", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    assert.equal(formatCalendarDate("2026-09-29"), "9/29");
    assert.equal(formatCalendarDate("2026-09-29", true), "9/29(火)");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("deadline labels use the API calendar date across year boundaries", () => {
  assert.equal(homeDueState("2026-12-31", "2027-01-01"), "overdue");
  assert.equal(homeDueState("2027-01-01", "2027-01-01"), "today");
  assert.equal(homeDueState("2027-01-02", "2027-01-01"), "upcoming");
  assert.equal(homeDueState(null, "2027-01-01"), "undated");
});

test("task rows keep the existing project-scoped detail route", () => {
  assert.equal(
    homeTaskHref({ id: 12, project_id: 7 }),
    "/projects/joined/7/tasks/12",
  );
});
