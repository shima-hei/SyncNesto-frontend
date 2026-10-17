import assert from "node:assert/strict";
import test from "node:test";
import { safeArtifactOrigin, artifactReleasesHref } from "./navigation.ts";

test("固定版から元の要件の一覧条件・表示タブを含む経路へ戻れる", () => {
  const original =
    "/projects/joined/7/requirements/3/items/5?tab=design&returnTo=%2Fprojects%2Fjoined%2F7%2Frequirements%2F3%3Ftab%3Drequirements%26page%3D2#title";
  const href = new URL(
    artifactReleasesHref(7, "requirement", 5, 4, original),
    "https://syncnesto.invalid",
  );
  assert.equal(safeArtifactOrigin(href.searchParams.get("from"), 7), original);
});

test("外部・別案件・編集画面・不正URLを戻り先として使わない", () => {
  const fallback = "/projects/joined/7/requirements";
  for (const target of [
    "https://evil.example/projects/joined/7/requirements/3",
    "//evil.example",
    "/projects/joined/8/requirements/3",
    "/projects/joined/7/requirements/3/edit",
    "javascript:alert(1)",
    "https://[",
  ]) {
    assert.equal(safeArtifactOrigin(target, 7), fallback);
  }
  assert.equal(
    safeArtifactOrigin("/projects/joined/7/specifications/2?tab=overview", 7),
    "/projects/joined/7/specifications/2?tab=overview",
  );
});
