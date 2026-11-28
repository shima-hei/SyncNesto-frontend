"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApiSpecification,
  DatabaseColumn,
  DatabaseConstraint,
  DatabaseIndex,
  DatabaseRelationship,
  DatabaseSpecification,
  ProcessingStep,
  ScreenEvent,
  ScreenSpecification,
  ScreenState,
  ScreenTransition,
  SpecificationField,
} from "@/lib/api/generated/model";
import { readSpecification } from "../../lib/api";
import {
  specificationKeys,
  type Content,
  type Values,
} from "../../lib/specification";
import type { DesignReviewQuote } from "../../lib/specification";
import {
  designKey,
  readDesignCollections,
  readDesignDiagram,
  screenKinds,
} from "../../lib/workspace";
import { TextField } from "../specification-fields";
import { DesignGrid } from "./design-grid";
import { DesignFormats } from "./design-formats";
import { ApiOperationEditor } from "./api-operation-editor";

const Wireframes = dynamic(() =>
  import("./wireframe-editor").then((module) => module.WireframeEditor),
);
const HtmlMockups = dynamic(() =>
  import("./html-mockup-editor").then((module) => module.HtmlMockupEditor),
);
const RepresentativePreview = dynamic(() =>
  import("./screen-representative-preview").then(
    (module) => module.ScreenRepresentativePreview,
  ),
);
const select =
  "h-8 max-w-full min-w-0 rounded-md border bg-background px-2 text-sm";
const uid = () => crypto.randomUUID();
const databaseTypes = [
  "bigint",
  "integer",
  "smallint",
  "numeric",
  "real",
  "double precision",
  "text",
  "varchar",
  "boolean",
  "uuid",
  "date",
  "timestamp",
  "timestamptz",
  "jsonb",
  "bytea",
  "inet",
] as const;
const actions = [
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT",
] as const;
const stepKinds = {
  validation: "入力検証",
  condition: "条件判定",
  api: "API呼び出し",
  set_value: "値の設定",
  message: "メッセージ",
  state: "状態変更",
  transition: "画面遷移",
  db_read: "DB参照",
  db_write: "DB更新",
  auth: "認証・認可",
  transaction: "トランザクション",
  other: "その他",
} as const;
type Review = (path: string, context?: string | DesignReviewQuote) => void;

export const designTabs = {
  screen: [
    ["content", "レイアウト"],
    ["basic", "基本情報"],
    ["fields", "項目定義"],
    ["events", "イベント・遷移"],
    ["states", "状態・権限"],
  ],
  api: [
    ["content", "基本情報"],
    ["request", "リクエスト"],
    ["responses", "レスポンス"],
    ["processing", "処理仕様"],
    ["security", "認証・認可"],
    ["output", "OpenAPI"],
  ],
  database: [
    ["content", "基本情報"],
    ["columns", "カラム"],
    ["constraints", "制約"],
    ["indexes", "インデックス"],
    ["relationships", "リレーション"],
    ["output", "DDL"],
  ],
} as const;

export function detailsTab(kind: Content["type"], path: string): string {
  if (!path.startsWith("content/"))
    return kind === "screen" ? "basic" : "content";
  const field = path.split("/")[1];
  if (kind === "screen") {
    if (field === "fields") return "fields";
    if (field === "actions" || field === "transitions") return "events";
    if (field === "states") return "states";
    return field === "artboards" || field === "mockups" ? "content" : "basic";
  }
  if (kind === "api")
    return (
      {
        request_fields: "request",
        response_fields: "responses",
        responses: "responses",
        processing_steps: "processing",
        authentication: "security",
        authorization: "security",
        operation: path.startsWith("content/operation/responses/")
          ? "responses"
          : /^content\/operation\/(requestBody|parameters)(\/|$)/.test(path)
            ? "request"
            : "content",
      }[field] ?? "content"
    );
  return ["columns", "constraints", "indexes", "relationships"].includes(field)
    ? field
    : "content";
}

export function DesignDetails({
  projectId: scopedProjectId,
  id,
  values,
  onChange,
  readOnly,
  tab,
  onReview,
  revision,
  dirty = false,
  canRegisterParts = false,
  focusPath,
  focusQuote,
}: {
  id?: number;
  values: Values;
  onChange: (value: Values) => void;
  readOnly: boolean;
  tab: string;
  onReview?: Review;
  dirty?: boolean;
  canRegisterParts?: boolean;
  focusPath?: string | null;
  focusQuote?: DesignReviewQuote;
} & (
  | { projectId: number; revision?: number }
  | { projectId?: never; revision: number; readOnly: true }
)) {
  const projectId = scopedProjectId ?? 0;
  const { content } = values;
  const [layout, setLayout] = useState(
    focusPath?.startsWith("content/mockups/") ? "html" : "wireframe",
  );
  const set = (next: Content) => onChange({ ...values, content: next });
  const isBasic =
    content.type === "screen" ? tab === "basic" : tab === "content";
  const collections = useQuery({
    queryKey: [...designKey(projectId), "collections"],
    queryFn: () => readDesignCollections(projectId),
    enabled: Boolean(
      scopedProjectId && isBasic && content.type !== "screen" && !revision,
    ),
  });
  function title(label: string, field: "title" | "summary") {
    return (
      <TextField
        path={field}
        label={label}
        value={values[field]}
        readOnly={readOnly}
        onChange={(value) => onChange({ ...values, [field]: value })}
        multiline={field === "summary"}
        maxLength={field === "title" ? 200 : 10000}
        onReview={onReview}
      />
    );
  }
  if (isBasic) {
    return (
      <section className="grid min-w-0 max-w-4xl gap-4 sm:grid-cols-2">
        {title(
          content.type === "screen"
            ? "画面名"
            : content.type === "api"
              ? "API名"
              : "論理テーブル名",
          "title",
        )}
        {content.type === "screen" && (
          <>
            <label className="flex flex-col gap-2 text-sm font-medium">
              画面種別
              <select
                className={select}
                value={content.screen_kind ?? "other"}
                disabled={readOnly}
                onChange={(event) =>
                  set({
                    ...content,
                    screen_kind: event.target
                      .value as ScreenSpecification["screen_kind"],
                  })
                }
              >
                {Object.entries(screenKinds).map(([kind, label]) => (
                  <option value={kind} key={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              path="content/route"
              label="URL・識別子"
              value={content.route}
              readOnly={readOnly}
              onChange={(route) => set({ ...content, route })}
              onReview={onReview}
            />
          </>
        )}
        {content.type === "api" && (
          <>
            <label className="flex flex-col gap-2 text-sm font-medium">
              HTTPメソッド
              <select
                className={select}
                value={content.method ?? ""}
                disabled={readOnly}
                onChange={(event) =>
                  set({
                    ...content,
                    method: (event.target.value ||
                      null) as ApiSpecification["method"],
                  })
                }
              >
                <option value="">未確定</option>
                {[
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "HEAD",
                  "OPTIONS",
                  "TRACE",
                ].map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <TextField
              path="content/path"
              label="APIパス"
              value={content.path}
              readOnly={readOnly}
              onChange={(path) => set({ ...content, path })}
              onReview={onReview}
            />
          </>
        )}
        {content.type === "database" && (
          <>
            <TextField
              path="content/physical_name"
              label="物理テーブル名"
              value={content.physical_name}
              readOnly={readOnly}
              onChange={(physical_name) => set({ ...content, physical_name })}
              onReview={onReview}
              maxLength={63}
            />
            <TextField
              path="content/namespace"
              label="スキーマ"
              value={content.namespace}
              readOnly={readOnly}
              onChange={(namespace) => set({ ...content, namespace })}
              onReview={onReview}
              maxLength={63}
            />
          </>
        )}
        {content.type !== "screen" && !revision && (
          <label className="flex flex-col gap-2 text-sm font-medium">
            {content.type === "api" ? "API仕様セット" : "DBモデル"}
            <select
              className={select}
              value={content.collection_id ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                set({ ...content, collection_id: event.target.value || null })
              }
            >
              <option value="">既定</option>
              {collections.data
                ?.filter(
                  (item) =>
                    item.kind ===
                    (content.type === "api" ? "api_set" : "db_model"),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="sm:col-span-2">{title("目的", "summary")}</div>
        <div className="sm:col-span-2">
          <TextField
            path="content/notes"
            label="補足・未確定事項"
            value={content.notes}
            readOnly={readOnly}
            multiline
            maxLength={20000}
            onChange={(notes) => set({ ...content, notes })}
            onReview={onReview}
          />
        </div>
      </section>
    );
  }
  if (content.type === "screen") {
    if (tab === "content")
      return (
        <section className="min-w-0 space-y-3">
          <RepresentativePreview
            projectId={projectId}
            content={content}
            readOnly={readOnly}
            onChange={(representative_preview) =>
              set({ ...content, representative_preview })
            }
          />
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["wireframe", "ワイヤーフレーム"],
                ["html", "HTMLモックアップ"],
                ["references", "参考資料"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={layout === key ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={layout === key}
                onClick={() => setLayout(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          {layout === "wireframe" ? (
            <Wireframes
              projectId={projectId}
              canRegisterParts={canRegisterParts}
              items={content.artboards ?? []}
              fields={content.fields ?? []}
              events={content.actions ?? []}
              states={content.states ?? []}
              readOnly={readOnly}
              onReview={onReview}
              onChange={(artboards) =>
                set({
                  ...content,
                  artboards,
                  representative_preview:
                    content.representative_preview?.kind === "wireframe" &&
                    !artboards.some(
                      (item) =>
                        item.id === content.representative_preview?.target_id,
                    )
                      ? null
                      : content.representative_preview,
                })
              }
              onCreateReference={(kind, item, artboards) => {
                if (kind === "field")
                  set({
                    ...content,
                    artboards,
                    fields: [...(content.fields ?? []), item],
                  });
                else
                  set({
                    ...content,
                    artboards,
                    actions: [...(content.actions ?? []), item],
                  });
              }}
            />
          ) : layout === "html" ? (
            <HtmlMockups
              projectId={projectId}
              items={content.mockups ?? []}
              readOnly={readOnly}
              onChange={(mockups) =>
                set({
                  ...content,
                  mockups,
                  representative_preview:
                    content.representative_preview?.kind === "html" &&
                    !mockups.some(
                      (item) =>
                        item.id === content.representative_preview?.target_id,
                    )
                      ? null
                      : content.representative_preview,
                })
              }
              onReview={onReview}
              focusPath={focusPath}
              focusQuote={focusQuote}
            />
          ) : (
            <TextField
              path="content/reference_url"
              label="外部デザイン資料URL"
              value={content.reference_url}
              readOnly={readOnly}
              onChange={(reference_url) =>
                set({ ...content, reference_url: reference_url || null })
              }
              onReview={onReview}
            />
          )}
        </section>
      );
    if (tab === "fields")
      return (
        <FieldGrid
          rows={content.fields ?? []}
          onChange={(fields) => set({ ...content, fields })}
          path="content/fields"
          readOnly={readOnly}
          onReview={onReview}
        />
      );
    if (tab === "events")
      return (
        <ScreenEvents
          projectId={projectId}
          content={content}
          onChange={(next) => set({ ...next, type: "screen" })}
          readOnly={readOnly}
          onReview={onReview}
          revision={revision}
        />
      );
    if (tab === "states")
      return (
        <section className="space-y-3">
          <TextField
            path="content/audience"
            label="対象システムの利用者・操作権限"
            value={content.audience}
            readOnly={readOnly}
            multiline
            onChange={(audience) => set({ ...content, audience })}
            onReview={onReview}
          />
          <DesignGrid<ScreenState>
            rows={content.states ?? []}
            onChange={(states) => set({ ...content, states })}
            create={() => ({
              id: uid(),
              name: "",
              display: "unchanged",
              access: "unchanged",
            })}
            columns={[
              { key: "name", label: "状態" },
              { key: "audience", label: "利用者区分" },
              {
                key: "display",
                label: "表示",
                choices: [
                  ["unchanged", "共通"],
                  ["visible", "表示"],
                  ["hidden", "非表示"],
                ],
              },
              {
                key: "access",
                label: "操作",
                choices: [
                  ["unchanged", "共通"],
                  ["enabled", "有効"],
                  ["disabled", "無効"],
                  ["read_only", "読取専用"],
                ],
              },
            ]}
            label="状態"
            path="content/states"
            readOnly={readOnly}
            onReview={onReview}
            details={(row, update) => (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  対象項目
                  <select
                    className={select}
                    value={row.field_id ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      update({ ...row, field_id: event.target.value || null })
                    }
                  >
                    <option value="">画面全体</option>
                    {content.fields?.map((field) => (
                      <option value={field.id} key={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Property
                  label="メッセージ"
                  value={row.message}
                  readOnly={readOnly}
                  onChange={(message) => update({ ...row, message })}
                />
                <Property
                  label="値"
                  value={row.value}
                  readOnly={readOnly}
                  onChange={(value) => update({ ...row, value })}
                />
                <Property
                  label="説明"
                  value={row.description}
                  readOnly={readOnly}
                  onChange={(description) => update({ ...row, description })}
                />
              </>
            )}
          />
        </section>
      );
    return null;
  }
  if (tab === "output" && id)
    return (
      <DesignFormats
        key={revision ?? "draft"}
        projectId={projectId}
        kind={content.type}
        designId={id}
        revision={revision}
        dataChanged={dirty}
      />
    );
  if (content.type === "api") {
    if (tab === "request" || tab === "responses")
      return (
        <ApiOperationEditor
          content={content}
          onChange={(next) => set({ ...next, type: "api" })}
          tab={tab}
          onReview={onReview}
          focusPath={focusPath}
          readOnly={readOnly}
          legacy={
            <FieldGrid
              rows={
                tab === "request"
                  ? (content.request_fields ?? [])
                  : (content.response_fields ?? [])
              }
              readOnly={readOnly}
              path={
                tab === "request"
                  ? "content/request_fields"
                  : "content/response_fields"
              }
              onReview={onReview}
              onChange={(rows) =>
                set({
                  ...content,
                  [tab === "request" ? "request_fields" : "response_fields"]:
                    rows,
                })
              }
            />
          }
        />
      );
    if (tab === "security")
      return (
        <section className="grid max-w-4xl gap-3 sm:grid-cols-2">
          <TextField
            path="content/authentication"
            label="認証仕様"
            value={content.authentication}
            onChange={(authentication) => set({ ...content, authentication })}
            readOnly={readOnly}
            onReview={onReview}
            multiline
          />
          <TextField
            path="content/authorization"
            label="操作権限"
            value={content.authorization}
            onChange={(authorization) => set({ ...content, authorization })}
            readOnly={readOnly}
            onReview={onReview}
            multiline
          />
        </section>
      );
    if (tab === "processing")
      return (
        <ProcessingGrid
          steps={content.processing_steps ?? []}
          onChange={(processing_steps) => set({ ...content, processing_steps })}
          readOnly={readOnly}
          onReview={onReview}
          path="content/processing_steps"
        />
      );
    return null;
  }
  return (
    <DatabaseDetails
      projectId={projectId}
      id={id}
      tab={tab}
      content={content}
      readOnly={readOnly}
      revision={revision}
      onReview={onReview}
      onChange={(next) => set({ ...next, type: "database" })}
    />
  );
}

function Property({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value?: string | null;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <Input
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FieldGrid({
  rows,
  onChange,
  readOnly,
  onReview,
  path,
}: {
  rows: SpecificationField[];
  onChange: (data: SpecificationField[]) => void;
  readOnly: boolean;
  onReview?: Review;
  path: string;
}) {
  return (
    <DesignGrid<SpecificationField>
      rows={rows}
      onChange={onChange}
      readOnly={readOnly}
      onReview={onReview}
      label="項目"
      path={path}
      create={() => ({
        id: uid(),
        location: "body",
        data_type: "string",
        name: "",
      })}
      columns={[
        { key: "logical_id", label: "論理ID" },
        { key: "name", label: "項目名" },
        {
          key: "location",
          label: "分類",
          choices: [
            ["body", "入力"],
            ["display", "表示"],
            ["action", "操作"],
            ["path", "Path"],
            ["query", "Query"],
            ["header", "Header"],
            ["cookie", "Cookie"],
          ],
        },
        { key: "ui_component", label: "UI種別" },
        { key: "data_type", label: "型" },
        { key: "required", label: "必須", type: "boolean" },
      ]}
      details={(row, update) => (
        <>
          {(
            [
              ["description", "説明"],
              ["default_value", "初期値"],
              ["validation", "入力形式・正規表現"],
              ["constraints", "範囲・文字数・選択肢"],
              ["visibility", "表示条件"],
              ["enabled_when", "活性条件"],
              ["error_message", "エラーメッセージ"],
              ["example", "例"],
            ] as const
          ).map(([key, label]) => (
            <Property
              key={key}
              label={label}
              value={row[key]}
              readOnly={readOnly}
              onChange={(value) => update({ ...row, [key]: value })}
            />
          ))}
        </>
      )}
    />
  );
}

function ProcessingGrid({
  steps,
  onChange,
  readOnly,
  onReview,
  path,
}: {
  steps: ProcessingStep[];
  onChange: (steps: ProcessingStep[]) => void;
  readOnly: boolean;
  onReview?: Review;
  path: string;
}) {
  return (
    <div className="space-y-3">
      <DesignGrid<ProcessingStep>
        rows={steps}
        onChange={onChange}
        path={path}
        label="処理ステップ"
        readOnly={readOnly}
        onReview={onReview}
        create={() => ({ id: uid(), name: "", kind: "other" })}
        columns={[
          { key: "name", label: "処理" },
          { key: "kind", label: "種別", choices: Object.entries(stepKinds) },
          { key: "condition", label: "条件" },
        ]}
        details={(row, update) => (
          <>
            <Property
              label="処理内容"
              value={row.description}
              readOnly={readOnly}
              onChange={(description) => update({ ...row, description })}
            />
            <label className="flex flex-col gap-1 text-xs">
              参照する設計ID
              <Input
                type="number"
                min={1}
                value={row.specification_id ?? ""}
                readOnly={readOnly}
                onChange={(event) =>
                  update({
                    ...row,
                    specification_id: Number(event.target.value) || null,
                  })
                }
              />
            </label>
            {(["on_success", "on_failure"] as const).map((key) => (
              <label className="flex flex-col gap-1 text-xs" key={key}>
                {key === "on_success" ? "成功時" : "失敗時"}
                <select
                  className={select}
                  value={row[key] ?? ""}
                  disabled={readOnly}
                  onChange={(event) =>
                    update({ ...row, [key]: event.target.value || null })
                  }
                >
                  <option value="">指定なし</option>
                  {steps
                    .filter((step) => step.id !== row.id)
                    .map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </>
        )}
      />
      {!!steps.length && (
        <ol
          aria-label="処理フロー"
          className="flex flex-wrap items-start gap-2 rounded-md border bg-muted/30 p-3"
        >
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="min-w-28 rounded border bg-background p-2 text-xs"
            >
              <strong>
                {index + 1}. {step.name || stepKinds[step.kind ?? "other"]}
              </strong>
              {step.condition && <p>{step.condition}</p>}
              {step.on_success && (
                <p>
                  成功 →{" "}
                  {steps.find((item) => item.id === step.on_success)?.name}
                </p>
              )}
              {step.on_failure && (
                <p>
                  失敗 →{" "}
                  {steps.find((item) => item.id === step.on_failure)?.name}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ScreenEvents({
  projectId,
  content,
  onChange,
  readOnly,
  onReview,
  revision,
}: {
  projectId: number;
  content: ScreenSpecification;
  onChange: (value: ScreenSpecification) => void;
  readOnly: boolean;
  onReview?: Review;
  revision?: number;
}) {
  const options = useQuery({
    queryKey: [...designKey(projectId), "transition-targets"],
    queryFn: () =>
      readDesignDiagram(projectId, { kind: "screen", page_size: 100 }),
    enabled: !revision,
  });
  const [eventId, setEventId] = useState<string>();
  const events = content.actions ?? [];
  const active = events.find((event) => event.id === eventId);
  const transitions = content.transitions ?? [];
  return (
    <div className="space-y-4">
      <DesignGrid<ScreenEvent>
        rows={events}
        onChange={(actions) => onChange({ ...content, actions })}
        create={() => ({ id: uid(), name: "", trigger: "クリック" })}
        label="イベント"
        path="content/actions"
        readOnly={readOnly}
        onReview={onReview}
        columns={[
          { key: "name", label: "イベント名" },
          { key: "trigger", label: "トリガー" },
          { key: "description", label: "概要" },
        ]}
        details={(event) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEventId(event.id)}
          >
            処理フローを開く
          </Button>
        )}
      />
      {active && (
        <ProcessingGrid
          key={active.id}
          steps={active.steps ?? []}
          path={`content/actions/${active.id}/steps`}
          onChange={(steps) =>
            onChange({
              ...content,
              actions: events.map((event) =>
                event.id === active.id ? { ...event, steps } : event,
              ),
            })
          }
          readOnly={readOnly}
          onReview={onReview}
        />
      )}
      <DesignGrid<ScreenTransition>
        rows={transitions}
        onChange={(value) => onChange({ ...content, transitions: value })}
        create={() => ({
          id: uid(),
          target_id: options.data?.nodes[0]?.id ?? 1,
          name: "",
          mode: "page",
        })}
        label="遷移"
        path="content/transitions"
        readOnly={readOnly}
        onReview={onReview}
        columns={[
          { key: "name", label: "遷移名" },
          { key: "trigger", label: "トリガー" },
          { key: "condition", label: "条件" },
          {
            key: "mode",
            label: "遷移方式",
            choices: [
              ["page", "ページ"],
              ["modal", "モーダル"],
              ["drawer", "ドロワー"],
              ["new_tab", "別タブ"],
              ["other", "その他"],
            ],
          },
        ]}
        details={(row, update) => (
          <>
            <label className="flex flex-col gap-1 text-xs">
              接続先
              <select
                className={select}
                disabled={readOnly}
                value={row.target_id}
                onChange={(event) =>
                  update({ ...row, target_id: Number(event.target.value) })
                }
              >
                {!options.data?.nodes.some(
                  (node) => node.id === row.target_id,
                ) && (
                  <option value={row.target_id}>画面ID {row.target_id}</option>
                )}
                {options.data?.nodes.map((node) => (
                  <option value={node.id} key={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              イベント
              <select
                className={select}
                disabled={readOnly}
                value={row.event_id ?? ""}
                onChange={(event) =>
                  update({ ...row, event_id: event.target.value || null })
                }
              >
                <option value="">関連なし</option>
                {events.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <Property
              label="パラメータ"
              value={row.parameters}
              readOnly={readOnly}
              onChange={(parameters) => update({ ...row, parameters })}
            />
            <Property
              label="補足仕様"
              value={row.description}
              readOnly={readOnly}
              onChange={(description) => update({ ...row, description })}
            />
          </>
        )}
      />
    </div>
  );
}

function ColumnSelection({
  columns,
  value,
  disabled,
  onChange,
  label,
}: {
  columns: DatabaseColumn[];
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
  label: string;
}) {
  return (
    <fieldset className="space-y-1 text-xs">
      <legend>{label}</legend>
      {columns.map(
        (column) =>
          column.id && (
            <label key={column.id} className="flex gap-2">
              <input
                type="checkbox"
                className="accent-primary"
                disabled={disabled}
                checked={value.includes(column.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...value, column.id!]
                      : value.filter((id) => id !== column.id),
                  )
                }
              />
              {value.includes(column.id) && (
                <span>{value.indexOf(column.id) + 1}.</span>
              )}
              {column.physical_name || column.name || "カラム"}
            </label>
          ),
      )}
    </fieldset>
  );
}

function DatabaseDetails({
  projectId,
  id,
  content,
  onChange,
  tab,
  readOnly,
  onReview,
  revision,
}: {
  projectId: number;
  id?: number;
  content: DatabaseSpecification;
  onChange: (value: DatabaseSpecification) => void;
  tab: string;
  readOnly: boolean;
  onReview?: Review;
  revision?: number;
}) {
  const options = useQuery({
    queryKey: [...designKey(projectId), "tables"],
    queryFn: () =>
      readDesignDiagram(projectId, { kind: "database", page_size: 100 }),
    enabled: (tab === "constraints" || tab === "relationships") && !revision,
  });
  const columns = content.columns ?? [];
  if (tab === "columns")
    return (
      <DesignGrid<DatabaseColumn>
        rows={columns}
        onChange={(columns) => onChange({ ...content, columns })}
        create={() => ({
          id: uid(),
          name: "",
          physical_name: "",
          data_type: "text",
          nullable: true,
        })}
        columns={[
          { key: "name", label: "論理名" },
          { key: "physical_name", label: "物理名" },
          {
            key: "data_type",
            label: "型",
            choices: databaseTypes.map((type) => [type, type]),
          },
          { key: "nullable", label: "NULL許容", type: "boolean" },
          { key: "default_value", label: "既定値" },
        ]}
        label="カラム"
        path="content/columns"
        readOnly={readOnly}
        onReview={onReview}
        details={(row, update) => (
          <>
            <Property
              label="論理型"
              value={row.logical_type}
              readOnly={readOnly}
              onChange={(logical_type) => update({ ...row, logical_type })}
            />
            <Property
              label="説明"
              value={row.description}
              readOnly={readOnly}
              onChange={(description) => update({ ...row, description })}
            />
            {(["length", "precision", "scale"] as const).map((key, index) => (
              <label key={key} className="flex flex-col gap-1 text-xs">
                {["長さ", "精度", "スケール"][index]}
                <Input
                  type="number"
                  min={0}
                  value={row[key] ?? ""}
                  readOnly={readOnly}
                  onChange={(event) =>
                    update({
                      ...row,
                      [key]: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs">
              IDENTITY
              <select
                className={select}
                value={row.identity ?? ""}
                disabled={readOnly}
                onChange={(event) =>
                  update({
                    ...row,
                    identity: (event.target.value ||
                      null) as DatabaseColumn["identity"],
                  })
                }
              >
                <option value="">なし</option>
                <option value="always">ALWAYS</option>
                <option value="by_default">BY DEFAULT</option>
              </select>
            </label>
          </>
        )}
      />
    );
  if (tab === "constraints")
    return (
      <DesignGrid<DatabaseConstraint>
        rows={content.constraints ?? []}
        onChange={(constraints) => onChange({ ...content, constraints })}
        create={() => ({
          id: uid(),
          kind: "primary_key",
          name: "",
          column_ids: [],
        })}
        columns={[
          { key: "name", label: "制約名" },
          {
            key: "kind",
            label: "種別",
            choices: [
              ["primary_key", "PRIMARY KEY"],
              ["foreign_key", "FOREIGN KEY"],
              ["unique", "UNIQUE"],
              ["check", "CHECK"],
              ["not_null", "NOT NULL"],
            ],
          },
          { key: "description", label: "説明" },
        ]}
        label="制約"
        path="content/constraints"
        readOnly={readOnly}
        onReview={onReview}
        details={(row, update) => (
          <ConstraintDetails
            projectId={projectId}
            id={id}
            value={row}
            options={
              options.data?.nodes.filter(
                (node) =>
                  node.collection_id === content.collection_id ||
                  (!node.collection_id && !content.collection_id),
              ) ?? []
            }
            columns={columns}
            readOnly={readOnly}
            revision={revision}
            onChange={update}
          />
        )}
      />
    );
  if (tab === "indexes")
    return (
      <DesignGrid<DatabaseIndex>
        rows={content.indexes ?? []}
        onChange={(indexes) => onChange({ ...content, indexes })}
        create={() => ({
          id: uid(),
          name: "",
          method: "btree",
          column_ids: [],
        })}
        columns={[
          { key: "name", label: "名前" },
          {
            key: "method",
            label: "方式",
            choices: ["btree", "hash", "gin", "gist", "brin", "spgist"].map(
              (value) => [value, value],
            ),
          },
          { key: "unique", label: "一意", type: "boolean" },
        ]}
        label="インデックス"
        path="content/indexes"
        readOnly={readOnly}
        onReview={onReview}
        details={(row, update) => (
          <>
            <ColumnSelection
              columns={columns}
              value={row.column_ids ?? []}
              disabled={readOnly}
              label="対象カラム（選択順）"
              onChange={(column_ids) =>
                update({
                  ...row,
                  column_ids,
                  descending: row.descending?.filter((id) =>
                    column_ids.includes(id),
                  ),
                })
              }
            />
            <ColumnSelection
              columns={columns.filter(
                (column) => !!column.id && row.column_ids?.includes(column.id),
              )}
              value={row.descending ?? []}
              disabled={readOnly}
              label="降順"
              onChange={(descending) => update({ ...row, descending })}
            />
            <Property
              label="条件"
              value={row.predicate}
              readOnly={readOnly}
              onChange={(predicate) => update({ ...row, predicate })}
            />
          </>
        )}
      />
    );
  if (tab === "relationships")
    return (
      <DesignGrid<DatabaseRelationship>
        rows={content.relationships ?? []}
        onChange={(relationships) => onChange({ ...content, relationships })}
        create={() => ({
          id: uid(),
          name: "",
          target_id: id ?? options.data?.nodes[0]?.id ?? 1,
          cardinality: "one_to_many",
        })}
        columns={[
          { key: "name", label: "論理関連名" },
          {
            key: "cardinality",
            label: "多重度",
            choices: [
              ["one_to_one", "1 対 1"],
              ["one_to_many", "1 対 多"],
              ["many_to_many", "多 対 多"],
            ],
          },
          { key: "optional", label: "任意", type: "boolean" },
        ]}
        label="論理リレーション"
        path="content/relationships"
        readOnly={readOnly}
        onReview={onReview}
        details={(row, update) => (
          <>
            <label className="flex flex-col gap-1 text-xs">
              対象テーブル
              <select
                className={select}
                disabled={readOnly}
                value={row.target_id}
                onChange={(event) =>
                  update({ ...row, target_id: Number(event.target.value) })
                }
              >
                {!options.data?.nodes.some(
                  (node) => node.id === row.target_id,
                ) && (
                  <option value={row.target_id}>DB-ID {row.target_id}</option>
                )}
                {options.data?.nodes.map((node) => (
                  <option value={node.id} key={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              対応する外部キー
              <select
                className={select}
                disabled={readOnly}
                value={row.constraint_id ?? ""}
                onChange={(event) =>
                  update({ ...row, constraint_id: event.target.value || null })
                }
              >
                <option value="">未設定</option>
                {content.constraints
                  ?.filter(
                    (item) =>
                      item.kind === "foreign_key" &&
                      item.target_id === row.target_id,
                  )
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <Property
              label="論理仕様"
              value={row.description}
              readOnly={readOnly}
              onChange={(description) => update({ ...row, description })}
            />
          </>
        )}
      />
    );
  return null;
}

function ConstraintDetails({
  projectId,
  id,
  value,
  options,
  columns,
  readOnly,
  revision,
  onChange,
}: {
  projectId: number;
  id?: number;
  value: DatabaseConstraint;
  options: { id: number; title: string }[];
  columns: DatabaseColumn[];
  readOnly: boolean;
  revision?: number;
  onChange: (item: DatabaseConstraint) => void;
}) {
  const targetId = value.target_id;
  const target = useQuery({
    queryKey: specificationKeys.detail(projectId, targetId ?? 0),
    queryFn: () => readSpecification(projectId, targetId!),
    enabled: Boolean(
      targetId && targetId !== id && value.kind === "foreign_key" && !revision,
    ),
  });
  const remote =
    targetId === id
      ? columns
      : target.data?.content.type === "database"
        ? (target.data.content.columns ?? [])
        : [];
  return (
    <>
      <ColumnSelection
        columns={columns}
        label="対象カラム（選択順）"
        value={value.column_ids ?? []}
        disabled={readOnly}
        onChange={(column_ids) => onChange({ ...value, column_ids })}
      />
      {value.kind === "check" && (
        <label className="flex flex-col gap-1 text-xs">
          CHECK式
          <Textarea
            value={value.expression ?? ""}
            readOnly={readOnly}
            onChange={(event) =>
              onChange({ ...value, expression: event.target.value })
            }
          />
        </label>
      )}
      {value.kind === "foreign_key" && (
        <>
          <label className="flex flex-col gap-1 text-xs">
            参照先テーブル
            <select
              className={select}
              value={targetId ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...value,
                  target_id: Number(event.target.value) || null,
                  target_column_ids: [],
                })
              }
            >
              <option value="">未設定</option>
              {targetId &&
                !options.some((option) => option.id === targetId) && (
                  <option value={targetId}>DB-ID {targetId}</option>
                )}
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <ColumnSelection
            columns={remote}
            label="参照先カラム（選択順）"
            value={value.target_column_ids ?? []}
            disabled={readOnly}
            onChange={(target_column_ids) =>
              onChange({ ...value, target_column_ids })
            }
          />
          {(["on_delete", "on_update"] as const).map((key) => (
            <label className="flex flex-col gap-1 text-xs" key={key}>
              {key === "on_delete" ? "ON DELETE" : "ON UPDATE"}
              <select
                className={select}
                disabled={readOnly}
                value={value[key] ?? "NO ACTION"}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
              >
                {actions.map((action) => (
                  <option key={action}>{action}</option>
                ))}
              </select>
            </label>
          ))}
        </>
      )}
    </>
  );
}
