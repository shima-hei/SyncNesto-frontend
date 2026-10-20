import test from "node:test";
import assert from "node:assert/strict";
import { approvalNextActionHref } from "./approval-next-action.ts";

test("next actions retain the verified requirement parent and existing editors", () => {
  assert.equal(
    approvalNextActionHref(3, {
      kind: "edit_source",
      source_kind: "requirement",
      source_id: 7,
      document_id: 9,
    }),
    "/projects/joined/3/requirements/9/items/7/edit",
  );
  assert.equal(
    approvalNextActionHref(3, {
      kind: "open_source",
      source_kind: "requirement",
      source_id: 7,
    }),
    null,
  );
  assert.equal(
    approvalNextActionHref(3, {
      kind: "edit_source",
      source_kind: "test_design",
      source_id: 7,
    }),
    "/projects/joined/3/test-designs/7",
  );
  assert.equal(
    approvalNextActionHref(3, {
      kind: "edit_source",
      source_kind: "specification",
      source_id: 7,
    }),
    "/projects/joined/3/specifications/7/edit",
  );
  assert.equal(
    approvalNextActionHref(3, {
      kind: "open_source",
      source_kind: "requirement_document",
      source_id: 9,
    }),
    "/projects/joined/3/requirements/9",
  );
});

test("publication actions use a fixed application path and do not accept raw destinations", () => {
  assert.equal(
    approvalNextActionHref(3, {
      kind: "open_publication",
      publication_id: "opaque",
    }),
    "/projects/joined/3/artifact-publications?publication=opaque",
  );
  assert.equal(
    approvalNextActionHref(3, {
      kind: "open_publication",
      href: "https://evil.test",
    }),
    null,
  );
  assert.equal(
    approvalNextActionHref(3, { kind: "open_fixed_versions" }),
    "/projects/joined/3/artifact-releases",
  );
});
