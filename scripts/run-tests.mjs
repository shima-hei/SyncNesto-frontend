import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
const result = spawnSync(
  process.execPath,
  ["--test", ...process.argv.slice(2), ...files],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
