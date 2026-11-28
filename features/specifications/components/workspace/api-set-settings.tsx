"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { asObject, asString, type JsonObject } from "../../lib/openapi-schema";
import { specificationHref } from "../../lib/specification";
import { designKey, readOpenApiUsage } from "../../lib/workspace";
import { SchemaTree } from "./api-operation-editor";

const categories = {
  schemas: "スキーマ",
  parameters: "パラメータ",
  responses: "レスポンス",
  requestBodies: "リクエスト本文",
  headers: "ヘッダー",
  securitySchemes: "認証方式",
  examples: "サンプル",
  callbacks: "コールバック",
  links: "リンク",
  pathItems: "パス項目",
} as const;
type Category = keyof typeof categories;
const defaultInfo = { title: "", version: "0.1.0", description: "" };
const select =
  "h-8 max-w-full min-w-0 rounded-md border bg-background px-2 text-sm";

function objectJson(source: string) {
  try {
    const value: unknown = JSON.parse(source);
    return value && typeof value === "object" && !Array.isArray(value)
      ? asObject(value)
      : null;
  } catch {
    return null;
  }
}

export function ApiSetSettings({
  projectId,
  collectionId,
  name,
  value,
  onChange,
}: {
  projectId: number;
  collectionId?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = objectJson(value);
  const save = (configuration: JsonObject) =>
    onChange(JSON.stringify(configuration, null, 2));
  const info = { ...defaultInfo, title: name, ...asObject(parsed?.info) };
  const servers = Array.isArray(parsed?.servers) ? parsed.servers : [];
  const tags = Array.isArray(parsed?.tags) ? parsed.tags : [];
  return (
    <Tabs defaultValue="settings" className="min-w-0">
      <TabsList className="h-auto flex-wrap justify-start">
        <TabsTrigger value="settings">仕様セット設定</TabsTrigger>
        <TabsTrigger value="components">共通コンポーネント</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="space-y-3">
        {parsed ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                OpenAPIバージョン
                <Input
                  value={
                    typeof parsed.openapi === "string"
                      ? parsed.openapi
                      : "3.1.1"
                  }
                  onChange={(event) =>
                    save({ ...parsed, openapi: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                APIバージョン
                <Input
                  value={asString(info.version)}
                  onChange={(event) =>
                    save({
                      ...parsed,
                      info: { ...info, version: event.target.value },
                    })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                API契約のタイトル
                <Input
                  value={asString(info.title)}
                  onChange={(event) =>
                    save({
                      ...parsed,
                      info: { ...info, title: event.target.value },
                    })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                説明
                <Textarea
                  rows={2}
                  value={asString(info.description)}
                  onChange={(event) =>
                    save({
                      ...parsed,
                      info: { ...info, description: event.target.value },
                    })
                  }
                />
              </label>
            </div>
            <section
              className="space-y-2 rounded-md border p-2"
              aria-label="OpenAPIのサーバー定義"
            >
              <h3 className="text-sm font-medium">サーバー定義</h3>
              {servers.map((server, index) => (
                <div key={index} className="flex flex-wrap gap-2">
                  <Input
                    aria-label={`サーバー ${index + 1} のURL`}
                    className="flex-1"
                    value={asString(asObject(server).url)}
                    onChange={(event) =>
                      save({
                        ...parsed,
                        servers: servers.map((item, at) =>
                          at === index
                            ? { ...asObject(server), url: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={`サーバー ${index + 1} の説明`}
                    className="flex-1"
                    value={asString(asObject(server).description)}
                    onChange={(event) =>
                      save({
                        ...parsed,
                        servers: servers.map((item, at) =>
                          at === index
                            ? {
                                ...asObject(server),
                                description: event.target.value,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    aria-label={`サーバー ${index + 1} を削除`}
                    onClick={() =>
                      save({
                        ...parsed,
                        servers: servers.filter((_, at) => at !== index),
                      })
                    }
                  >
                    削除
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  save({ ...parsed, servers: [...servers, { url: "" }] })
                }
              >
                サーバーを追加
              </Button>
            </section>
            <section
              className="space-y-2 rounded-md border p-2"
              aria-label="OpenAPIのタグ"
            >
              <h3 className="text-sm font-medium">タグ</h3>
              {tags.map((tag, index) => (
                <div key={index} className="flex flex-wrap gap-2">
                  <Input
                    aria-label={`タグ ${index + 1} の名前`}
                    className="flex-1"
                    value={asString(asObject(tag).name)}
                    onChange={(event) =>
                      save({
                        ...parsed,
                        tags: tags.map((item, at) =>
                          at === index
                            ? { ...asObject(tag), name: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    aria-label={`タグ ${index + 1} を削除`}
                    onClick={() =>
                      save({
                        ...parsed,
                        tags: tags.filter((_, at) => at !== index),
                      })
                    }
                  >
                    削除
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  save({ ...parsed, tags: [...tags, { name: "" }] })
                }
              >
                タグを追加
              </Button>
            </section>
          </>
        ) : (
          <p role="status" className="text-sm">
            JSONタブで設定の構文を確認してください。
          </p>
        )}
      </TabsContent>
      <TabsContent
        value="components"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        {parsed ? (
          <SharedComponents
            projectId={projectId}
            collectionId={collectionId}
            configuration={parsed}
            onChange={save}
          />
        ) : (
          <p role="status" className="text-sm">
            JSONタブで設定の構文を確認してください。
          </p>
        )}
      </TabsContent>
      <TabsContent value="json">
        <Textarea
          aria-label="セット・モデルの設定"
          className="font-mono text-xs"
          value={value}
          rows={8}
          onChange={(event) => onChange(event.target.value)}
        />
      </TabsContent>
    </Tabs>
  );
}

function SharedComponents({
  projectId,
  collectionId,
  configuration,
  onChange,
}: {
  projectId: number;
  collectionId?: string;
  configuration: JsonObject;
  onChange: (value: JsonObject) => void;
}) {
  const [category, setCategory] = useState<Category>("schemas");
  const [selection, setSelection] = useState("");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [showUsage, setShowUsage] = useState(false);
  const [page, setPage] = useState(1);
  const components = asObject(configuration.components);
  const group = asObject(components[category]);
  const keys = Object.keys(group).sort((a, b) => a.localeCompare(b));
  const selected = keys.includes(selection) ? selection : (keys[0] ?? "");
  const record = group[selected];
  const key = `${category}/${selected}`;
  const identifier = name.trim();
  const save = (group: JsonObject) =>
    onChange({
      ...configuration,
      components: { ...components, [category]: group },
    });
  const usage = useQuery({
    queryKey: [
      ...designKey(projectId),
      "api-usage",
      collectionId,
      category,
      selected,
      page,
    ],
    queryFn: ({ signal }) =>
      readOpenApiUsage(
        projectId,
        collectionId!,
        { category, name: selected, page, page_size: 20 },
        { signal },
      ),
    enabled: Boolean(collectionId && selected && showUsage),
    retry: false,
  });
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          種類
          <select
            className={select}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as Category);
              setSelection("");
              setShowUsage(false);
              setPage(1);
              setError("");
            }}
          >
            {Object.entries(categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          共通定義
          <select
            className={select}
            value={selected}
            onChange={(event) => {
              setSelection(event.target.value);
              setShowUsage(false);
              setPage(1);
              setError("");
            }}
          >
            {!keys.length && <option value="">登録なし</option>}
            {keys.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          定義名
          <Input
            value={name}
            className="h-8"
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            !/^[\w.-]+$/.test(identifier) || Object.hasOwn(group, identifier)
          }
          onClick={() => {
            save({
              ...group,
              [identifier]:
                category === "schemas"
                  ? { type: "object", properties: {} }
                  : {},
            });
            setSelection(identifier);
            setName("");
            setShowUsage(false);
            setPage(1);
            setError("");
          }}
        >
          定義を追加
        </Button>
      </div>
      {selected && (
        <>
          {category === "schemas" &&
            typeof record === "object" &&
            record !== null && (
              <SchemaTree
                key={key}
                label={selected}
                depth={0}
                value={asObject(record)}
                readOnly={false}
                onChange={(value) => {
                  save({ ...group, [selected]: value });
                  setDrafts((previous) => {
                    const next = { ...previous };
                    delete next[key];
                    return next;
                  });
                }}
              />
            )}
          <details
            className="space-y-2 rounded-md border p-2"
            key={key}
            open={category !== "schemas" ? true : undefined}
          >
            <summary className="cursor-pointer text-sm">定義のJSON</summary>
            <Textarea
              aria-label="共通定義のJSON"
              rows={5}
              className="font-mono text-xs"
              value={drafts[key] ?? JSON.stringify(record, null, 2)}
              onChange={(event) =>
                setDrafts({ ...drafts, [key]: event.target.value })
              }
            />
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={drafts[key] === undefined}
              onClick={() => {
                const raw = drafts[key];
                if (raw === undefined) return;
                const value = objectJson(raw);
                const boolean =
                  category === "schemas" &&
                  ["true", "false"].includes(raw.trim());
                if (value === null && !boolean) {
                  setError("定義のJSONを確認してください。");
                  return;
                }
                save({
                  ...group,
                  [selected]: boolean ? raw.trim() === "true" : value,
                });
                setError("");
                setDrafts((previous) => {
                  const next = { ...previous };
                  delete next[key];
                  return next;
                });
              }}
            >
              定義のJSONを反映
            </Button>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </details>
          <div className="flex flex-wrap gap-2">
            {collectionId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-expanded={showUsage}
                onClick={() => setShowUsage(!showUsage)}
              >
                利用中のAPIを表示
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = { ...group };
                delete next[selected];
                save(next);
                setShowUsage(false);
                setPage(1);
              }}
            >
              定義を削除
            </Button>
          </div>
          {showUsage && (
            <div className="space-y-2 rounded-md border p-2">
              {usage.isPending && (
                <p role="status" className="text-sm">
                  利用中のAPIを検索中…
                </p>
              )}
              <FormApiError error={usage.error} />
              {usage.data && (
                <>
                  {!usage.data.items.length && (
                    <p className="text-sm text-muted-foreground">
                      この定義を参照するAPIはありません。
                    </p>
                  )}
                  <ul className="space-y-1">
                    {usage.data.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          className="text-sm text-primary hover:underline"
                          href={specificationHref(projectId, item.id)}
                        >
                          {item.method ?? "未確定"} {item.path} · {item.title} ·
                          版 {item.version}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {usage.data.total > 20 && (
                    <DataPagination
                      page={page}
                      total={usage.data.total}
                      pageSize={20}
                      currentCount={usage.data.items.length}
                      onPageChange={setPage}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
