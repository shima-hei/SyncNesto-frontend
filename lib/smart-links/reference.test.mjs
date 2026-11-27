import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSmartLink,
  sharedPublicationLinkId,
  smartLinkPath,
} from "./reference.ts";

const origin = "http://localhost:3217";
const task = "/projects/joined/5/tasks/110";
const item = "ea5ac41f-4a48-47c8-8452-f990ffb78ac8";

test("shared comment titles are requested only for exact same-origin publication links", () => {
  const path = `/shared/publications/${item}`;
  assert.equal(sharedPublicationLinkId(path, origin), item);
  assert.equal(
    sharedPublicationLinkId(`${origin}${path}#shared-comments`, origin),
    item,
  );
  for (const href of [
    `https://another.example${path}`,
    `//localhost:3217${path}`,
    `http://user@localhost:3217${path}`,
    `/projects/..${path}`,
    `${path}/files`,
    task,
  ]) {
    assert.equal(sharedPublicationLinkId(href, origin), undefined, href);
  }
});

test("recognizes exact resource routes while retaining their navigation context", () => {
  const requirement = parseSmartLink(
    "/projects/joined/5/requirements/23/items/15?tenant=7#comments",
    origin,
  );
  assert.deepEqual(requirement?.reference, {
    kind: "requirement",
    id: "15",
    project_id: 5,
    container_id: 23,
  });
  assert.equal(requirement?.tenantId, 7);
  assert.equal(
    requirement?.localHref,
    "/projects/joined/5/requirements/23/items/15?tenant=7#comments",
  );
  assert.equal(
    smartLinkPath(requirement.reference),
    "/projects/joined/5/requirements/23/items/15",
  );

  for (const [kind, path] of [
    ["test_item", `/projects/joined/5/test-designs/8?item=${item}`],
    ["test_case", `/projects/joined/5/test-cases?design=8&case=${item}`],
    [
      "document_attachment",
      `/projects/joined/5/documents/8?tab=attachments#attachment-${item}`,
    ],
  ]) {
    const target = parseSmartLink(origin + path, origin);
    assert.equal(target?.reference.kind, kind);
    assert.equal(target?.reference.container_id, 8);
    assert.equal(smartLinkPath(target.reference), path);
  }
});

test("resolves configured same-database hosts and rejects ambiguous or external references", () => {
  const permitted = ["https://syncnesto.vercel.app", "http://localhost:3100"];
  assert.equal(
    parseSmartLink(permitted[0] + task, permitted[1])?.localHref,
    task,
  );
  for (const href of [
    permitted[0] + task,
    "https://example.com" + task,
    "//localhost:3217" + task,
    "http://name@localhost:3217" + task,
    "javascript:alert(1)",
    "/projects/joined/05/tasks/110",
    "/projects/joined/5/tasks/00110",
    "/projects/joined/5/tasks/2147483648",
    "/projects/joined/5/inert/../tasks/110",
    "/projects/joined/5/tasks/%31%31%30",
    task + "/edit",
    task + "?tenant=7&tenant=8",
    `/projects/joined/5/test-cases?case=${item}`,
  ]) {
    assert.equal(parseSmartLink(href, origin), null, href);
  }
});
