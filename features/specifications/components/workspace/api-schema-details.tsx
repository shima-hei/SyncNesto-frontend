"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sampleFromSchema, type JsonObject } from "../../lib/openapi-schema";

const textFields = [
  ["format", "形式"],
  ["pattern", "文字列パターン"],
] as const;
const measuredFields = [
  ["minLength", "最小文字数", "count"],
  ["maxLength", "最大文字数", "count"],
  ["minimum", "最小値", "number"],
  ["maximum", "最大値", "number"],
  ["exclusiveMinimum", "下限（値を含まない）", "number"],
  ["exclusiveMaximum", "上限（値を含まない）", "number"],
  ["multipleOf", "倍数", "positive"],
  ["minItems", "配列の最小件数", "count"],
  ["maxItems", "配列の最大件数", "count"],
  ["minProperties", "オブジェクトの最小項目数", "count"],
  ["maxProperties", "オブジェクトの最大項目数", "count"],
] as const;
const jsonFields = [
  ["default", "既定値", "value"],
  ["enum", "許容値（配列）", "choices"],
  ["examples", "サンプル（配列）", "array"],
  ["additionalProperties", "追加プロパティ", "schema"],
  ["allOf", "allOf", "schemas"],
  ["anyOf", "anyOf", "schemas"],
  ["oneOf", "oneOf", "schemas"],
] as const;
const numericText = (value: unknown) =>
  typeof value === "number" ? String(value) : "";
const jsonText = (value: unknown) =>
  value === undefined ? "" : JSON.stringify(value, null, 2);
const isObject = (value: unknown) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const isSchema = (value: unknown) =>
  typeof value === "boolean" || isObject(value);

export function SchemaDetails({
  value,
  readOnly,
  onChange,
}: {
  value: JsonObject;
  readOnly: boolean;
  onChange: (value: JsonObject) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <details
      className="rounded-md border px-2 py-1"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-xs font-medium">詳細制約</summary>
      {open && (
        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const input = new FormData(event.currentTarget);
            const next = { ...value };
            try {
              for (const [key] of textFields) {
                const text = String(input.get(key) ?? "");
                if (text) next[key] = text;
                else delete next[key];
              }
              for (const [key, label, rule] of measuredFields) {
                const text = String(input.get(key) ?? "");
                if (!text) {
                  delete next[key];
                  continue;
                }
                const number = Number(text);
                if (
                  !Number.isFinite(number) ||
                  (rule === "count" &&
                    (!Number.isSafeInteger(number) || number < 0)) ||
                  (rule === "positive" && number <= 0)
                )
                  throw new Error(`${label}を確認してください。`);
                next[key] = number;
              }
              for (const [key, label, kind] of jsonFields) {
                const text = String(input.get(key) ?? "").trim();
                if (!text) {
                  delete next[key];
                  continue;
                }
                let parsed: unknown;
                try {
                  parsed = JSON.parse(text);
                } catch {
                  throw new Error(`${label}をJSONで入力してください。`);
                }
                if (kind === "schema" && !isSchema(parsed))
                  throw new Error(
                    `${label}は真偽値かスキーマを指定してください。`,
                  );
                if (
                  (kind === "array" ||
                    kind === "choices" ||
                    kind === "schemas") &&
                  (!Array.isArray(parsed) ||
                    (kind !== "array" && !parsed.length) ||
                    (kind === "schemas" && !parsed.every(isSchema)))
                )
                  throw new Error(`${label}の配列を確認してください。`);
                next[key] = parsed;
              }
              if (input.get("uniqueItems") === "on") next.uniqueItems = true;
              else if (Object.hasOwn(next, "uniqueItems"))
                next.uniqueItems = false;
              setError("");
              onChange(next);
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "制約の値を確認してください。",
              );
            }
          }}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            {textFields.map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                <Input
                  className="h-8"
                  name={key}
                  defaultValue={
                    typeof value[key] === "string" ? String(value[key]) : ""
                  }
                  readOnly={readOnly}
                />
              </label>
            ))}
            {measuredFields.map(([key, label, rule]) => (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                <Input
                  className="h-8"
                  name={key}
                  type="number"
                  step={rule === "count" ? 1 : "any"}
                  min={rule === "count" ? 0 : undefined}
                  defaultValue={numericText(value[key])}
                  readOnly={readOnly}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs">
              <input
                name="uniqueItems"
                type="checkbox"
                defaultChecked={value.uniqueItems === true}
                disabled={readOnly}
              />
              配列内で値を重複させない
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {jsonFields.map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                <Textarea
                  className="min-h-14 font-mono text-xs"
                  name={key}
                  defaultValue={jsonText(value[key])}
                  rows={2}
                  readOnly={readOnly}
                />
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {!readOnly && (
            <Button type="submit" size="sm" variant="outline">
              制約を反映
            </Button>
          )}
        </form>
      )}
    </details>
  );
}

export function MediaExamples({
  value,
  readOnly,
  onChange,
}: {
  value: JsonObject;
  readOnly: boolean;
  onChange: (value: JsonObject) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [sample, setSample] = useState<string>();
  const key = JSON.stringify([value.example, value.examples]);
  return (
    <details
      className="rounded-md border px-2 py-1"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        サンプルJSON
      </summary>
      {open && (
        <form
          key={key}
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const input = new FormData(event.currentTarget);
            const single = String(input.get("example") ?? "").trim();
            const named = String(input.get("examples") ?? "").trim();
            if (single && named) {
              setError(
                "単一のサンプルか名前付きサンプルのどちらかを入力してください。",
              );
              return;
            }
            try {
              const next = { ...value };
              delete next.example;
              delete next.examples;
              if (single) next.example = JSON.parse(single);
              if (named) {
                const parsed: unknown = JSON.parse(named);
                if (!isObject(parsed)) throw new Error("invalid named samples");
                next.examples = parsed;
              }
              setError("");
              onChange(next);
            } catch {
              setError("サンプルを有効なJSONで入力してください。");
            }
          }}
        >
          <label className="grid gap-1 text-xs">
            単一のサンプル
            <Textarea
              name="example"
              className="font-mono"
              defaultValue={jsonText(value.example)}
              rows={3}
              readOnly={readOnly}
            />
          </label>
          <label className="grid gap-1 text-xs">
            名前付きサンプル
            <Textarea
              name="examples"
              className="font-mono"
              defaultValue={jsonText(value.examples)}
              rows={3}
              readOnly={readOnly}
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" variant="outline">
                サンプルを反映
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSample(jsonText(sampleFromSchema(value.schema)))
                }
              >
                サンプル候補を生成
              </Button>
            </div>
          )}
          {!!sample && (
            <label className="grid gap-1 text-xs">
              生成した候補
              <Textarea
                className="font-mono"
                value={sample}
                rows={4}
                readOnly
              />
            </label>
          )}
        </form>
      )}
    </details>
  );
}
