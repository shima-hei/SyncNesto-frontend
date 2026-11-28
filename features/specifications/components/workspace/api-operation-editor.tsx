"use client";

import { useId, useState, type ReactNode } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApiSpecification,
  ApiSpecificationOperation,
} from "@/lib/api/generated/model";
import {
  asObject,
  asString,
  duplicateSchema,
  initializeOperation,
  orderedProperties,
  propertyOrderKey,
  schemaTypes,
  type JsonObject,
} from "../../lib/openapi-schema";
import { reviewElementId } from "../../lib/specification";
import { MediaExamples, SchemaDetails } from "./api-schema-details";

const selectClass = "h-8 min-w-0 rounded-md border bg-background px-2 text-sm";
const pathSegment = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");
type Review = (path: string, label: string) => void;
const parameterStyles = {
  path: ["simple", "label", "matrix"],
  query: ["form", "spaceDelimited", "pipeDelimited", "deepObject"],
  header: ["simple"],
  cookie: ["form"],
};

export function ApiOperationEditor({
  content,
  onChange,
  tab,
  readOnly,
  legacy,
  onReview,
  focusPath,
}: {
  content: ApiSpecification;
  onChange: (value: ApiSpecification) => void;
  tab: "request" | "responses";
  readOnly: boolean;
  legacy: ReactNode;
  onReview?: Review;
  focusPath?: string | null;
}) {
  const operation = asObject(content.operation);
  const update = (value: JsonObject) =>
    onChange({ ...content, operation: value as ApiSpecificationOperation });
  const [responseCode, setResponseCode] = useState(
    focusPath?.startsWith("content/operation/responses/")
      ? focusPath.split("/")[3]
      : "200",
  );
  const parameters = Array.isArray(operation.parameters)
    ? operation.parameters.map(asObject)
    : [];
  const responses = asObject(operation.responses);
  const selectedResponse = responses[responseCode]
    ? responseCode
    : (Object.keys(responses).at(0) ?? "200");
  const response = asObject(responses[selectedResponse]);
  const requestBody = asObject(operation.requestBody);
  const [expanded, setExpanded] = useState(false);
  const updateParameter = (index: number, value: JsonObject) =>
    update({
      ...operation,
      parameters: parameters.map((parameter, at) =>
        at === index ? value : parameter,
      ),
    });
  const updateResponse = (value: JsonObject) =>
    update({
      ...operation,
      responses: { ...responses, [selectedResponse]: value },
    });
  if (!content.operation) {
    return (
      <section className="space-y-4">
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => update(initializeOperation(content))}
          >
            OpenAPI定義を作成
          </Button>
        )}
        {legacy}
      </section>
    );
  }
  return (
    <section className="max-w-5xl space-y-4">
      {tab === "request" ? (
        <>
          <div className="space-y-2 rounded-md border p-3">
            <h3 className="text-sm font-semibold">Parameters</h3>
            {parameters.map((parameter, index) => {
              const id = asString(parameter["x-syncnesto-id"]);
              const label = asString(parameter.name ?? parameter.$ref);
              const anchor =
                id && label
                  ? `content/operation/parameters/${pathSegment(id)}/${parameter.$ref ? "$ref" : "name"}`
                  : undefined;
              return (
                <div
                  key={asString(parameter["x-syncnesto-id"]) || index}
                  className="grid items-start gap-2 border-t pt-2 sm:grid-cols-[1fr_auto_1fr_auto]"
                >
                  <Input
                    aria-label={`パラメータ ${index + 1}の名前`}
                    readOnly={readOnly}
                    id={anchor ? reviewElementId(anchor) : undefined}
                    value={asString(parameter.name ?? parameter.$ref)}
                    onChange={(event) =>
                      updateParameter(index, {
                        ...parameter,
                        [parameter.$ref ? "$ref" : "name"]: event.target.value,
                      })
                    }
                  />
                  {!parameter.$ref && (
                    <>
                      <select
                        className={selectClass}
                        aria-label="パラメータの配置"
                        value={asString(parameter.in) || "query"}
                        disabled={readOnly}
                        onChange={(event) => {
                          const location = event.target
                            .value as keyof typeof parameterStyles;
                          const next = {
                            ...parameter,
                            in: location,
                            required:
                              location === "path" ||
                              parameter.required === true,
                          } as JsonObject;
                          if (
                            !parameterStyles[location].includes(
                              asString(next.style),
                            )
                          )
                            delete next.style;
                          updateParameter(index, next);
                        }}
                      >
                        {["path", "query", "header", "cookie"].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                      {!parameter.content && (
                        <PropertySchema
                          label="パラメータ型"
                          value={asObject(parameter.schema)}
                          readOnly={readOnly}
                          onChange={(schema) =>
                            updateParameter(index, { ...parameter, schema })
                          }
                        />
                      )}
                    </>
                  )}
                  {anchor && onReview && (
                    <SchemaReviewButton
                      path={anchor}
                      label={label}
                      onReview={onReview}
                    />
                  )}
                  {!parameter.$ref && (
                    <details className="space-y-2 sm:col-span-full">
                      <summary className="cursor-pointer text-xs">
                        パラメータ設定
                      </summary>
                      <ParameterSettings
                        parameter={parameter}
                        readOnly={readOnly}
                        onChange={(next) => updateParameter(index, next)}
                      />
                    </details>
                  )}
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        update({
                          ...operation,
                          parameters: parameters.filter(
                            (_, at) => at !== index,
                          ),
                        })
                      }
                    >
                      削除
                    </Button>
                  )}
                </div>
              );
            })}
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    ...operation,
                    parameters: [
                      ...parameters,
                      {
                        name: "",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        "x-syncnesto-id": crypto.randomUUID(),
                      },
                    ],
                  })
                }
              >
                パラメータを追加
              </Button>
            )}
          </div>
          {requestBody.$ref ? (
            <p className="rounded-md border p-3 font-mono text-xs break-all">
              {asString(requestBody.$ref)}
            </p>
          ) : (
            <MediaEditor
              label="Request Body"
              path="content/operation/requestBody/content"
              onReview={onReview}
              focusPath={focusPath}
              media={asObject(requestBody.content)}
              readOnly={readOnly}
              onChange={(value) =>
                update({
                  ...operation,
                  requestBody: { ...requestBody, content: value },
                })
              }
            />
          )}
        </>
      ) : (
        <>
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label="レスポンスステータス"
          >
            {Object.keys(responses).map((code) => (
              <Button
                key={code}
                size="sm"
                variant={code === selectedResponse ? "secondary" : "ghost"}
                aria-pressed={code === selectedResponse}
                onClick={() => setResponseCode(code)}
              >
                {code}
              </Button>
            ))}
            {!readOnly && (
              <form
                className="flex gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const code = String(form.get("status") ?? "");
                  if (
                    !/^(?:[1-5](?:\d{2}|XX)|default)$/.test(code) ||
                    Object.hasOwn(responses, code)
                  )
                    return;
                  update({
                    ...operation,
                    responses: {
                      ...responses,
                      [code]: { description: "レスポンス" },
                    },
                  });
                  setResponseCode(code);
                }}
              >
                <Input
                  name="status"
                  className="h-8 w-24"
                  aria-label="HTTPステータス"
                  placeholder="400"
                  required
                />
                <Button type="submit" variant="outline" size="sm">
                  レスポンスを追加
                </Button>
              </form>
            )}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            レスポンスの説明
            <Input
              id={reviewElementId(
                `content/operation/responses/${selectedResponse}/description`,
              )}
              value={asString(response.description)}
              readOnly={readOnly}
              onChange={(event) =>
                updateResponse({ ...response, description: event.target.value })
              }
            />
          </label>
          {onReview && typeof response.description === "string" && (
            <SchemaReviewButton
              path={`content/operation/responses/${selectedResponse}/description`}
              label={`${selectedResponse}の説明`}
              onReview={onReview}
            />
          )}
          {response.$ref ? (
            <p className="rounded-md border p-3 font-mono text-xs break-all">
              {asString(response.$ref)}
            </p>
          ) : (
            <>
              <ResponseHeaders
                key={selectedResponse}
                headers={asObject(response.headers)}
                readOnly={readOnly}
                onChange={(headers) => updateResponse({ ...response, headers })}
              />
              <MediaEditor
                label="Response Body"
                path={`content/operation/responses/${selectedResponse}/content`}
                onReview={onReview}
                focusPath={focusPath}
                media={asObject(response.content)}
                readOnly={readOnly}
                onChange={(value) =>
                  updateResponse({ ...response, content: value })
                }
              />
            </>
          )}
        </>
      )}
      <Button
        size="sm"
        variant="outline"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        OpenAPI操作の原文
      </Button>
      {expanded && (
        <RawOperation
          key={JSON.stringify(operation)}
          value={operation}
          readOnly={readOnly}
          onChange={update}
        />
      )}
      <details className="space-y-2 rounded-md border p-3">
        <summary className="cursor-pointer text-sm">移行前の項目定義</summary>
        {legacy}
      </details>
    </section>
  );
}

function ParameterSettings({
  parameter,
  readOnly,
  onChange,
}: {
  parameter: JsonObject;
  readOnly: boolean;
  onChange: (value: JsonObject) => void;
}) {
  const location = asString(parameter.in) as keyof typeof parameterStyles;
  const styles = parameterStyles[location] ?? [];
  const style = asString(parameter.style);
  const explode = parameter.explode;
  return (
    <div className="mt-2 space-y-2 rounded-md bg-muted/30 p-2">
      <label className="flex flex-col gap-1 text-xs">
        説明
        <Input
          value={asString(parameter.description)}
          readOnly={readOnly}
          onChange={(event) =>
            onChange({ ...parameter, description: event.target.value })
          }
        />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={location === "path" || parameter.required === true}
            disabled={readOnly || location === "path"}
            onChange={(event) =>
              onChange({ ...parameter, required: event.target.checked })
            }
          />
          必須
        </label>
        {!parameter.content && (
          <>
            <label className="flex flex-col gap-1 text-xs">
              シリアライズ方式
              <select
                className={selectClass}
                value={style}
                disabled={readOnly}
                onChange={(event) => {
                  const next = { ...parameter };
                  if (event.target.value) next.style = event.target.value;
                  else delete next.style;
                  onChange(next);
                }}
              >
                <option value="">既定値</option>
                {style && !styles.includes(style) && (
                  <option value={style}>{style}</option>
                )}
                {styles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              explode
              <select
                className={selectClass}
                value={typeof explode === "boolean" ? String(explode) : ""}
                disabled={readOnly}
                onChange={(event) => {
                  const next = { ...parameter };
                  if (event.target.value)
                    next.explode = event.target.value === "true";
                  else delete next.explode;
                  onChange(next);
                }}
              >
                <option value="">既定値</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          </>
        )}
      </div>
      {!parameter.content && (
        <SchemaTree
          label={asString(parameter.name) || "パラメータ"}
          depth={0}
          value={asObject(parameter.schema)}
          readOnly={readOnly}
          onChange={(schema) => onChange({ ...parameter, schema })}
        />
      )}
    </div>
  );
}

function ResponseHeaders({
  headers,
  readOnly,
  onChange,
}: {
  headers: JsonObject;
  readOnly: boolean;
  onChange: (value: JsonObject) => void;
}) {
  const [error, setError] = useState("");
  return (
    <section className="space-y-2 rounded-md border p-3">
      <h3 className="text-sm font-semibold">レスポンスヘッダー</h3>
      {Object.entries(headers).map(([name, raw]) => {
        const header = asObject(raw);
        const change = (value: JsonObject) =>
          onChange({ ...headers, [name]: value });
        return (
          <details key={name} className="space-y-2 rounded border p-2">
            <summary className="cursor-pointer font-mono text-xs">
              {name}
            </summary>
            <label className="flex flex-col gap-1 text-xs">
              {header.$ref ? "共通ヘッダー参照" : "説明"}
              <Input
                value={asString(header.$ref ?? header.description)}
                readOnly={readOnly}
                onChange={(event) =>
                  change({
                    ...header,
                    [header.$ref ? "$ref" : "description"]: event.target.value,
                  })
                }
              />
            </label>
            {!header.$ref && !header.content && (
              <SchemaTree
                label={name}
                depth={0}
                value={asObject(header.schema)}
                readOnly={readOnly}
                onChange={(schema) => change({ ...header, schema })}
              />
            )}
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = { ...headers };
                  delete next[name];
                  onChange(next);
                }}
              >
                ヘッダーを削除
              </Button>
            )}
          </details>
        );
      })}
      {!readOnly && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const name = String(new FormData(form).get("name") ?? "").trim();
            if (
              !/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(name) ||
              name.toLowerCase() === "content-type"
            ) {
              setError(
                "Content-Type以外の有効なヘッダー名を入力してください。",
              );
              return;
            }
            if (
              Object.keys(headers).some(
                (key) => key.toLowerCase() === name.toLowerCase(),
              )
            ) {
              setError("同じ名前のヘッダーが定義されています。");
              return;
            }
            onChange({ ...headers, [name]: { schema: { type: "string" } } });
            setError("");
            form.reset();
          }}
        >
          <Input
            name="name"
            aria-label="レスポンスヘッダー名"
            placeholder="X-Request-Id"
            className="h-8 max-w-52"
            required
          />
          <Button type="submit" size="sm" variant="outline">
            ヘッダーを追加
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function RawOperation({
  value,
  onChange,
  readOnly,
}: {
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  readOnly: boolean;
}) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState(false);
  return (
    <div className="space-y-2">
      <Textarea
        aria-label="OpenAPI操作JSON"
        readOnly={readOnly}
        className="font-mono text-xs"
        rows={14}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
      />
      {!readOnly && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              const parsed: unknown = JSON.parse(raw);
              if (parsed !== asObject(parsed)) throw new Error("not an object");
              onChange(asObject(parsed));
              setError(false);
            } catch {
              setError(true);
            }
          }}
        >
          JSONを反映
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          JSONオブジェクトを指定してください。
        </p>
      )}
    </div>
  );
}

function MediaEditor({
  label,
  media,
  onChange,
  readOnly,
  path,
  onReview,
  focusPath,
}: {
  label: string;
  media: JsonObject;
  onChange: (media: JsonObject) => void;
  readOnly: boolean;
  path?: string;
  onReview?: Review;
  focusPath?: string | null;
}) {
  const [selected, setSelected] = useState(() => {
    if (path && focusPath?.startsWith(`${path}/`))
      return (
        Object.keys(media).find((key) =>
          focusPath.startsWith(`${path}/${pathSegment(key)}/`),
        ) ?? "application/json"
      );
    return "application/json";
  });
  const keys = Object.keys(media);
  const current = keys.includes(selected) ? selected : (keys.at(0) ?? selected);
  const body = asObject(media[current]);
  return (
    <section className="space-y-2 rounded-md border p-3">
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          aria-label={`${label}のContent-Type`}
          value={current}
          onChange={(event) => setSelected(event.target.value)}
        >
          {!keys.length && <option value={current}>Content-Type未設定</option>}
          {keys.map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
        {!readOnly && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get("media-type") ?? "",
              ).trim();
              if (
                !/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(value) ||
                Object.hasOwn(media, value)
              )
                return;
              onChange({
                ...media,
                [value]: { schema: { type: "object", properties: {} } },
              });
              setSelected(value);
            }}
          >
            <Input
              className="h-8 max-w-44"
              name="media-type"
              aria-label="新しいContent-Type"
              placeholder="application/json"
              required
            />
            <Button type="submit" variant="outline" size="sm">
              追加
            </Button>
          </form>
        )}
      </div>
      {keys.length > 0 && (
        <>
          <SchemaTree
            value={asObject(body.schema)}
            readOnly={readOnly}
            depth={0}
            label={current}
            path={path ? `${path}/${pathSegment(current)}/schema` : undefined}
            onReview={onReview}
            focusPath={focusPath}
            onChange={(schema) =>
              onChange({ ...media, [current]: { ...body, schema } })
            }
          />
          <MediaExamples
            key={current}
            value={body}
            readOnly={readOnly}
            onChange={(examples) => onChange({ ...media, [current]: examples })}
          />
        </>
      )}
    </section>
  );
}

function PropertySchema({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  readOnly: boolean;
}) {
  const types = Array.isArray(value.type)
    ? value.type.filter((type): type is string => typeof type === "string")
    : typeof value.type === "string"
      ? [value.type]
      : [];
  const nullable = types.includes("null");
  const concrete = types.filter((type) => type !== "null");
  const primary =
    concrete.length > 1
      ? "multiple"
      : (concrete[0] ?? (nullable ? "null" : ""));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        aria-label={label}
        value={primary}
        disabled={readOnly}
        onChange={(event) => {
          const next = { ...value };
          if (event.target.value)
            next.type =
              nullable && event.target.value !== "null"
                ? [event.target.value, "null"]
                : event.target.value;
          else delete next.type;
          onChange(next);
        }}
      >
        <option value="">未設定</option>
        {primary === "multiple" && (
          <option value="multiple" disabled>
            {concrete.join(" | ")}
          </option>
        )}
        {schemaTypes.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>
      {concrete.length > 0 && (
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            aria-label={`${label}でnullを許可`}
            checked={nullable}
            disabled={readOnly}
            onChange={(event) =>
              onChange({
                ...value,
                type: event.target.checked
                  ? [...concrete, "null"]
                  : concrete.length === 1
                    ? concrete[0]
                    : concrete,
              })
            }
          />
          nullを許可
        </label>
      )}
    </div>
  );
}

export function SchemaTree({
  value,
  onChange,
  readOnly,
  depth,
  label,
  path,
  onReview,
  focusPath,
}: {
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  readOnly: boolean;
  depth: number;
  label: string;
  path?: string;
  onReview?: Review;
  focusPath?: string | null;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(
    depth < 1 || Boolean(path && focusPath?.startsWith(`${path}/`)),
  );
  const reviewKey = ["type", "$ref", "description", "format"].find(
    (key) => typeof value[key] === "string",
  );
  const anchor = path && reviewKey ? `${path}/${reviewKey}` : undefined;
  const properties = asObject(value.properties);
  const order = orderedProperties(value);
  const items = asObject(value.items);
  const hasType = (type: string) =>
    value.type === type ||
    (Array.isArray(value.type) && value.type.includes(type));
  const required = Array.isArray(value.required) ? value.required : [];
  function moveProperty(index: number, delta: number) {
    const next = [...order];
    const [name] = next.splice(index, 1);
    next.splice(index + delta, 0, name);
    onChange({ ...value, [propertyOrderKey]: next });
  }
  function copyProperty(name: string, schema: unknown, index: number) {
    let suffix = 1;
    let copy = `${name}_copy`;
    while (Object.hasOwn(properties, copy)) copy = `${name}_copy${++suffix}`;
    const nextOrder = [...order];
    nextOrder.splice(index + 1, 0, copy);
    onChange({
      ...value,
      properties: { ...properties, [copy]: duplicateSchema(schema) },
      [propertyOrderKey]: nextOrder,
      ...(required.includes(name) ? { required: [...required, copy] } : {}),
    });
  }
  if (depth > 18)
    return (
      <p className="text-xs">これより深い定義はOpenAPI原文で確認できます。</p>
    );
  return (
    <div className="min-w-0 border-l pl-2">
      <div
        className="flex flex-wrap items-center gap-1 border-b py-1"
        id={anchor ? reviewElementId(anchor) : undefined}
        tabIndex={anchor ? -1 : undefined}
      >
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "▾" : "▸"} {label}
        </Button>
        <PropertySchema
          label={`${label}の型`}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
        {!!value.$ref && (
          <span className="font-mono text-xs">{asString(value.$ref)}</span>
        )}
        {anchor && onReview && (
          <SchemaReviewButton path={anchor} label={label} onReview={onReview} />
        )}
      </div>
      {expanded && (
        <div className="space-y-2 py-2">
          <label className="flex gap-2 text-xs" htmlFor={id}>
            共通スキーマ参照
            <Input
              id={id}
              className="h-7 max-w-80"
              value={asString(value.$ref)}
              readOnly={readOnly}
              placeholder="#/components/schemas/..."
              onChange={(event) => {
                const next = { ...value };
                if (event.target.value) next.$ref = event.target.value;
                else delete next.$ref;
                onChange(next);
              }}
            />
          </label>
          <SchemaDetails
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
          {order.map((name, index) => {
            const schema = properties[name];
            return (
              <div
                key={asString(asObject(schema)["x-syncnesto-id"]) || name}
                className="space-y-1 pl-2"
              >
                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      className="flex gap-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const replacement = String(
                          new FormData(event.currentTarget).get("name") ?? "",
                        ).trim();
                        if (
                          !replacement ||
                          replacement === name ||
                          Object.hasOwn(properties, replacement)
                        )
                          return;
                        onChange({
                          ...value,
                          properties: Object.fromEntries(
                            Object.entries(properties).map(([key, child]) =>
                              key === name
                                ? [
                                    replacement,
                                    typeof child === "boolean"
                                      ? child
                                      : {
                                          ...asObject(child),
                                          "x-syncnesto-id":
                                            asString(
                                              asObject(child)["x-syncnesto-id"],
                                            ) || crypto.randomUUID(),
                                        },
                                  ]
                                : [key, child],
                            ),
                          ),
                          required: required.map((key) =>
                            key === name ? replacement : key,
                          ),
                          [propertyOrderKey]: order.map((key) =>
                            key === name ? replacement : key,
                          ),
                        });
                      }}
                    >
                      <Input
                        name="name"
                        className="h-7 max-w-36"
                        aria-label={`${name}の名前`}
                        key={name}
                        defaultValue={name}
                        required
                      />
                      <Button size="sm" type="submit" variant="ghost">
                        名前変更
                      </Button>
                    </form>
                    <label className="flex gap-1 text-xs">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={required.includes(name)}
                        onChange={(event) =>
                          onChange({
                            ...value,
                            required: event.target.checked
                              ? [...required, name]
                              : required.filter((key) => key !== name),
                          })
                        }
                      />
                      必須
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`${name}を上に移動`}
                      onClick={() => moveProperty(index, -1)}
                    >
                      上へ
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === order.length - 1}
                      aria-label={`${name}を下に移動`}
                      onClick={() => moveProperty(index, 1)}
                    >
                      下へ
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`${name}を複製`}
                      onClick={() => copyProperty(name, schema, index)}
                    >
                      複製
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onChange({
                          ...value,
                          properties: Object.fromEntries(
                            Object.entries(properties).filter(
                              ([key]) => key !== name,
                            ),
                          ),
                          required: required.filter((key) => key !== name),
                          [propertyOrderKey]: order.filter(
                            (key) => key !== name,
                          ),
                        })
                      }
                    >
                      削除
                    </Button>
                  </div>
                )}
                {readOnly && required.includes(name) && (
                  <span className="text-xs text-muted-foreground">必須</span>
                )}
                {typeof schema === "boolean" ? (
                  <p className="text-xs font-mono">
                    {name} · {String(schema)}
                  </p>
                ) : (
                  <SchemaTree
                    value={asObject(schema)}
                    label={name}
                    path={
                      path
                        ? `${path}/properties/${pathSegment(asString(asObject(schema)["x-syncnesto-id"]) || name)}`
                        : undefined
                    }
                    onReview={onReview}
                    focusPath={focusPath}
                    depth={depth + 1}
                    readOnly={readOnly}
                    onChange={(next) =>
                      onChange({
                        ...value,
                        properties: { ...properties, [name]: next },
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          {(value.items !== undefined || hasType("array")) && (
            <SchemaTree
              value={items}
              label="items"
              path={path ? `${path}/items` : undefined}
              onReview={onReview}
              focusPath={focusPath}
              depth={depth + 1}
              readOnly={readOnly}
              onChange={(next) => onChange({ ...value, items: next })}
            />
          )}
          {!readOnly &&
            (hasType("object") || value.properties !== undefined) && (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(
                    new FormData(event.currentTarget).get("property") ?? "",
                  ).trim();
                  if (!name || Object.hasOwn(properties, name)) return;
                  onChange({
                    ...value,
                    properties: {
                      ...properties,
                      [name]: {
                        type: "string",
                        "x-syncnesto-id": crypto.randomUUID(),
                      },
                    },
                    [propertyOrderKey]: [...order, name],
                  });
                  event.currentTarget.reset();
                }}
              >
                <Input
                  name="property"
                  className="h-7 max-w-48"
                  placeholder="プロパティ名"
                  aria-label={`${label}の新しいプロパティ`}
                  required
                />
                <Button type="submit" variant="outline" size="sm">
                  子プロパティを追加
                </Button>
              </form>
            )}
        </div>
      )}
    </div>
  );
}

function SchemaReviewButton({
  path,
  label,
  onReview,
}: {
  path: string;
  label: string;
  onReview: Review;
}) {
  if (path.length > 300) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`${label}に指摘を追加`}
      onClick={() => onReview(path, label)}
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      指摘
    </Button>
  );
}
