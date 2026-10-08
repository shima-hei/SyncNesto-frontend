import assert from "node:assert/strict";
import test from "node:test";

import {
  notificationDateGroup,
  notificationHref,
  notificationMessage,
} from "./notification-display.ts";
import { formatRelativeDate } from "../../../lib/format/date.ts";

const item = {
  id: 1,
  type: "assigned",
  project_id: 7,
  target_type: "task",
  target_id: "8",
  target_status: "available",
  context: {},
  snapshot: {
    actor_name: "山田",
    project_name: "案件",
    target_title: "ログイン",
  },
};

test("target information maps to existing task, requirement, issue and comment routes", () => {
  assert.equal(notificationHref(item), "/projects/joined/7/tasks/8");
  assert.equal(
    notificationHref({
      ...item,
      target_type: "requirement",
      context: { document_id: 9 },
    }),
    "/projects/joined/7/requirements/9/items/8",
  );
  assert.equal(
    notificationHref({
      ...item,
      target_type: "open_issue",
      context: { document_id: 9 },
    }),
    "/projects/joined/7/requirements/9?tab=issues",
  );
  assert.equal(
    notificationHref({
      ...item,
      target_type: "task_comment",
      context: { task_id: 10 },
    }),
    "/projects/joined/7/tasks/10",
  );
  for (const target_type of [
    "requirement_comment",
    "requirement_target_comment",
  ]) {
    assert.equal(
      notificationHref({
        ...item,
        target_type,
        context: { document_id: 9, requirement_id: 12 },
      }),
      "/projects/joined/7/requirements/9/items/12",
    );
  }
  assert.equal(
    notificationHref({
      ...item,
      target_type: "test_design_comment",
      context: { design_id: 5, subject_type: "test_item", subject_id: "abc" },
    }),
    "/projects/joined/7/test-designs/5?item=abc",
  );
});

test("deleted, forbidden, and incomplete targets cannot become links", () => {
  for (const target_status of ["deleted", "forbidden"])
    assert.equal(notificationHref({ ...item, target_status }), null);
  assert.equal(notificationHref({ ...item, project_id: null }), null);
  assert.equal(notificationHref({ ...item, target_type: "requirement" }), null);
});

test("event text uses immutable snapshots and distinguishes requirement ownership", () => {
  assert.equal(
    notificationMessage(item),
    "山田さんがあなたを「ログイン」の担当者に設定しました",
  );
  assert.match(
    notificationMessage({ ...item, target_type: "requirement" }),
    /オーナー/,
  );
  assert.match(
    notificationMessage({ ...item, type: "mentioned" }),
    /コメントであなたをメンション/,
  );
});

test("relative times and groups handle the previous day and year boundary", () => {
  const now = new Date(2026, 0, 1, 12);
  const localTime = (year, month, day, hour, minute = 0) =>
    new Date(year, month - 1, day, hour, minute).toISOString();
  assert.equal(formatRelativeDate(localTime(2026, 1, 1, 11, 55), now), "5分前");
  assert.equal(formatRelativeDate(localTime(2026, 1, 1, 10), now), "2時間前");
  assert.equal(formatRelativeDate(localTime(2025, 12, 31, 0), now), "昨日");
  assert.equal(formatRelativeDate(localTime(2026, 1, 1, 13), now), "たった今");
  assert.equal(notificationDateGroup(localTime(2026, 1, 1, 10), now), "今日");
  assert.equal(notificationDateGroup(localTime(2025, 12, 31, 10), now), "昨日");
});
