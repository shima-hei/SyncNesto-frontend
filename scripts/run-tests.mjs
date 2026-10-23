import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return discover(path);
    return entry.isFile() && entry.name.endsWith(".test.mjs") ? [path] : [];
  });
}
const files = ["tests", "features", "lib"]
  .flatMap((directory) => discover(resolve(root, directory)))
  .sort();
if (files.length === 0) throw new Error("テストファイルが見つかりません");
const raw = process.argv.includes("--raw");
const reuse = process.argv.includes("--reuse");
const args = process.argv
  .slice(2)
  .filter((arg) => !["--raw", "--reuse"].includes(arg));
const artifacts = resolve(root, ".verify");
mkdirSync(artifacts, { recursive: true, mode: 0o700 });
const hash = createHash("sha256");
hash.update(
  JSON.stringify({
    args,
    node: process.version,
    environment: Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) =>
          !["_", "SHLVL", "PWD", "OLDPWD", "CODEX_TOOL_CALL_ID"].includes(key),
      ),
    ),
  }),
);
const listing = spawnSync(
  "git",
  ["ls-files", "-co", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
if (listing.status !== 0) throw new Error("検証指紋のGit取得に失敗しました");
for (const name of listing.stdout.split("\0").filter(Boolean)) {
  if (name.startsWith(".verify/")) continue;
  const path = resolve(root, name);
  hash.update(name);
  hash.update(
    existsSync(path) && statSync(path).isFile()
      ? readFileSync(path)
      : "deleted",
  );
}
for (const name of [
  ".env.local",
  ".env.test",
  "node_modules/.package-lock.json",
]) {
  const path = resolve(root, name);
  if (existsSync(path)) hash.update(readFileSync(path));
}
const fingerprint = hash.digest("hex");
function readResult(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}
const latest = resolve(artifacts, "last-test.json");
if (reuse && !process.env.CI && existsSync(latest)) {
  const previous = readResult(latest);
  if (
    previous.fingerprint === fingerprint &&
    previous.status === "passed" &&
    previous.complete &&
    Date.now() >= previous.at &&
    Date.now() - previous.at < 3600000
  ) {
    console.log(
      JSON.stringify({
        status: "reused",
        counts: previous.counts,
        run: previous.run,
      }),
    );
    process.exit(0);
  }
}
const run = resolve(artifacts, "test-" + randomUUID());
mkdirSync(run, { mode: 0o700 });
const report = resolve(run, "result.json");
const result = spawnSync(
  process.execPath,
  [
    "--test",
    ...(raw
      ? []
      : [
          "--test-reporter=./scripts/test-reporter.mjs",
          "--test-reporter=spec",
          "--test-reporter-destination=stdout",
          "--test-reporter-destination=" + resolve(run, "full.log"),
        ]),
    ...args,
    ...files,
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, SYNCNESTO_TEST_REPORT: report },
    timeout: 120000,
  },
);
const summary = readResult(report);
if (
  result.status !== 0 ||
  result.error ||
  !summary.complete ||
  summary.status !== "passed"
) {
  summary.status = "failed";
  summary.complete = Boolean(summary.complete);
  summary.runner_error = result.error?.message || result.signal || null;
  if (!raw)
    console.error(
      JSON.stringify({
        status: "failed",
        complete: summary.complete,
        runner_error: summary.runner_error,
        run,
      }),
    );
}
if (!raw) {
  writeFileSync(report, JSON.stringify(summary, null, 2), { mode: 0o600 });
  writeFileSync(
    latest,
    JSON.stringify({ ...summary, fingerprint, at: Date.now(), run }, null, 2),
    { mode: 0o600 },
  );
  console.log("完全ログ・全失敗: " + run);
}
process.exitCode =
  result.status === 0 && (raw || summary.status === "passed")
    ? 0
    : result.status || 1;
