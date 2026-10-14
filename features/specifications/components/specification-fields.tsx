"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import type {
  SpecificationField,
  SpecificationRule,
} from "@/lib/api/generated/model";
import { reviewElementId, type Values } from "../lib/specification";

type Review = (path: string, label: string) => void;
function ReviewLabel({
  path,
  label,
  inputId,
  onReview,
}: {
  path: string;
  label: string;
  inputId: string;
  onReview?: Review;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {onReview && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onReview(path, label)}
          aria-label={`${label}に指摘を追加`}
        >
          <MessageSquarePlusIcon data-icon="inline-start" />
          指摘
        </Button>
      )}
    </div>
  );
}
export function TextField({
  path,
  label,
  value,
  onChange,
  placeholder,
  help,
  multiline,
  readOnly,
  onReview,
  link,
  maxLength = 5000,
}: {
  path: string;
  label: string;
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  help?: string;
  multiline?: boolean;
  readOnly?: boolean;
  onReview?: Review;
  link?: boolean;
  maxLength?: number;
}) {
  const id = reviewElementId(path);
  return (
    <Field
      id={id}
      tabIndex={-1}
      className="min-w-0 scroll-mt-24 focus:outline-2 focus:outline-offset-4 focus:outline-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={`${id}-input`}>{label}</FieldLabel>
        {onReview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReview(path, label)}
            aria-label={`${label}に指摘を追加`}
          >
            <MessageSquarePlusIcon data-icon="inline-start" />
            指摘
          </Button>
        )}
      </div>
      {readOnly ? (
        <p className="min-h-8 whitespace-pre-wrap break-words text-sm">
          {link && value && /^https?:\/\//i.test(value) ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {value}
            </a>
          ) : (
            value || "未記入"
          )}
        </p>
      ) : multiline ? (
        <Textarea
          id={`${id}-input`}
          name={path}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
        />
      ) : (
        <Input
          id={`${id}-input`}
          name={path}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      )}
      {help && !readOnly && <FieldDescription>{help}</FieldDescription>}
    </Field>
  );
}

function MoveActions({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (step: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!index}
        aria-label="項目を上へ移動"
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={index === length - 1}
        aria-label="項目を下へ移動"
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="項目を削除"
        onClick={onRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

function move<T>(rows: T[], index: number, step: number) {
  const next = [...rows];
  [next[index], next[index + step]] = [next[index + step], next[index]];
  return next;
}

function Fields({
  title,
  help,
  path,
  rows,
  readOnly,
  onChange,
  onReview,
  screen,
}: {
  title: string;
  help: string;
  path: string;
  rows: SpecificationField[];
  readOnly: boolean;
  onChange: (rows: SpecificationField[]) => void;
  onReview?: Review;
  screen?: boolean;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length >= 200}
            onClick={() =>
              onChange([
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  data_type: "string",
                  location: screen ? "display" : "body",
                  required: false,
                },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            項目を追加
          </Button>
        )}
      </div>
      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "項目はまだありません。"
            : "「項目を追加」から1つずつ記入できます。未確定の項目も下書きに保存できます。"}
        </p>
      )}
      {rows.map((row, index) => {
        const base = `${path}/${row.id}`;
        const update = (
          key: keyof SpecificationField,
          value: string | boolean,
        ) =>
          onChange(
            rows.map((item, i) =>
              i === index ? { ...item, [key]: value } : item,
            ),
          );
        return (
          <div
            key={row.id}
            className="flex min-w-0 flex-col gap-4 border-b pb-5"
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "auto 250px",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {row.name || `項目 ${index + 1}`}
              </h3>
              {!readOnly && (
                <MoveActions
                  index={index}
                  length={rows.length}
                  onMove={(step) => onChange(move(rows, index, step))}
                  onRemove={() => setDeleting(row.id!)}
                />
              )}
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <TextField
                path={`${base}/name`}
                label="項目名"
                value={row.name}
                placeholder={screen ? "例: メールアドレス…" : "例: email…"}
                readOnly={readOnly}
                onReview={onReview}
                onChange={(value) => update("name", value)}
                maxLength={200}
              />
              <TextField
                path={`${base}/data_type`}
                label="データ型"
                value={row.data_type}
                placeholder="例: string / integer…"
                readOnly={readOnly}
                onReview={onReview}
                onChange={(value) => update("data_type", value)}
                maxLength={100}
              />
              <Field
                id={reviewElementId(`${base}/location`)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-2 focus:outline-ring"
              >
                <ReviewLabel
                  path={`${base}/location`}
                  label={screen ? "項目の役割" : "受け渡す場所"}
                  inputId={`${reviewElementId(base)}-location`}
                  onReview={onReview}
                />
                {readOnly ? (
                  <p className="text-sm">
                    {
                      {
                        path: "パス",
                        query: "クエリ",
                        header: "ヘッダー",
                        body: "本文・入力",
                        display: "表示",
                      }[row.location ?? "body"]
                    }
                  </p>
                ) : (
                  <Select
                    value={row.location ?? "body"}
                    onValueChange={(value) => update("location", value)}
                  >
                    <SelectTrigger id={`${reviewElementId(base)}-location`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(screen
                          ? [
                              ["body", "入力"],
                              ["display", "表示"],
                            ]
                          : [
                              ["path", "パス"],
                              ["query", "クエリ"],
                              ["header", "ヘッダー"],
                              ["body", "本文"],
                            ]
                        ).map(([value, label]) => (
                          <SelectItem value={value} key={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field
                id={reviewElementId(`${base}/required`)}
                tabIndex={-1}
                className="scroll-mt-24 focus:outline-2 focus:outline-ring"
              >
                <ReviewLabel
                  path={`${base}/required`}
                  label="必須項目"
                  inputId={`${reviewElementId(base)}-required`}
                  onReview={onReview}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${reviewElementId(base)}-required`}
                    checked={Boolean(row.required)}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      update("required", checked === true)
                    }
                  />
                  <label
                    htmlFor={`${reviewElementId(base)}-required`}
                    className="text-sm"
                  >
                    {row.required ? "必須" : "任意"}
                  </label>
                </div>
              </Field>
            </FieldGroup>
            <TextField
              path={`${base}/description`}
              label="内容・表示条件"
              value={row.description}
              multiline
              readOnly={readOnly}
              onReview={onReview}
              onChange={(value) => update("description", value)}
              placeholder="この項目の意味や表示する条件…"
            />
            <details>
              <summary className="cursor-pointer rounded-sm text-sm text-muted-foreground focus-visible:outline-2">
                入力規則・記入例
              </summary>
              <FieldGroup className="mt-3 grid gap-4 sm:grid-cols-2">
                <TextField
                  path={`${base}/validation`}
                  label="入力規則"
                  value={row.validation}
                  readOnly={readOnly}
                  onReview={onReview}
                  onChange={(value) => update("validation", value)}
                  placeholder="例: 254文字以内のメールアドレス…"
                />
                <TextField
                  path={`${base}/example`}
                  label="記入例"
                  value={row.example}
                  readOnly={readOnly}
                  onReview={onReview}
                  onChange={(value) => update("example", value)}
                  placeholder="例: member@example.com…"
                />
              </FieldGroup>
            </details>
          </div>
        );
      })}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="この項目を削除しますか？"
        description="保存後は版履歴に残ります。既存の指摘には、対象が変更されたことを表示します。"
        confirmLabel="項目を削除"
        destructive
        onConfirm={() => {
          onChange(rows.filter((row) => row.id !== deleting));
          setDeleting(null);
        }}
      />
    </section>
  );
}

function Rules({
  title,
  help,
  path,
  rows,
  nameLabel,
  destinationLabel,
  onChange,
  readOnly,
  onReview,
}: {
  title: string;
  help: string;
  path: string;
  rows: SpecificationRule[];
  nameLabel: string;
  destinationLabel?: string;
  onChange: (rows: SpecificationRule[]) => void;
  readOnly: boolean;
  onReview?: Review;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length >= 100}
            onClick={() =>
              onChange([
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  description: "",
                  destination: "",
                },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            追加
          </Button>
        )}
      </div>
      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          まだ記入されていません。
        </p>
      )}
      {rows.map((row, index) => {
        const base = `${path}/${row.id}`;
        const update = (key: keyof SpecificationRule, value: string) =>
          onChange(
            rows.map((item, i) =>
              i === index ? { ...item, [key]: value } : item,
            ),
          );
        return (
          <div key={row.id} className="flex flex-col gap-3 border-b pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {row.name || `${title} ${index + 1}`}
              </h3>
              {!readOnly && (
                <MoveActions
                  index={index}
                  length={rows.length}
                  onMove={(step) => onChange(move(rows, index, step))}
                  onRemove={() => setDeleting(row.id!)}
                />
              )}
            </div>
            <TextField
              path={`${base}/name`}
              label={nameLabel}
              value={row.name}
              onChange={(value) => update("name", value)}
              readOnly={readOnly}
              onReview={onReview}
              maxLength={200}
            />
            <TextField
              path={`${base}/description`}
              label="条件・振る舞い"
              value={row.description}
              multiline
              onChange={(value) => update("description", value)}
              readOnly={readOnly}
              onReview={onReview}
            />
            {destinationLabel && (
              <TextField
                path={`${base}/destination`}
                label={destinationLabel}
                value={row.destination}
                onChange={(value) => update("destination", value)}
                readOnly={readOnly}
                onReview={onReview}
                maxLength={1000}
              />
            )}
          </div>
        );
      })}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="この行を削除しますか？"
        description="保存後は版履歴に残ります。"
        confirmLabel="行を削除"
        destructive
        onConfirm={() => {
          onChange(rows.filter((row) => row.id !== deleting));
          setDeleting(null);
        }}
      />
    </section>
  );
}

export function SpecificationFields({
  values,
  onChange,
  readOnly = false,
  onReview,
}: {
  values: Values;
  onChange: (values: Values) => void;
  readOnly?: boolean;
  onReview?: Review;
}) {
  const content = values.content;
  const set = (key: string, value: unknown) =>
    onChange({ ...values, content: { ...content, [key]: value } });
  return (
    <FieldGroup className="min-w-0 gap-6">
      <TextField
        path="title"
        label="設計書名（必須）"
        value={values.title}
        onChange={(title) => onChange({ ...values, title })}
        readOnly={readOnly}
        onReview={onReview}
        maxLength={200}
        placeholder={
          content.type === "api" ? "例: ログインAPI…" : "例: ログイン画面…"
        }
      />
      <TextField
        path="summary"
        label="目的・実現すること"
        value={values.summary}
        onChange={(summary) => onChange({ ...values, summary })}
        multiline
        readOnly={readOnly}
        onReview={onReview}
        maxLength={10000}
        help="関連する要件を読み、誰が何をできるようにする設計かを書きます。"
        placeholder="例: 登録済みの利用者が、安全にログインできる…"
      />
      {content.type === "api" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field
              id={reviewElementId("content/method")}
              tabIndex={-1}
              className="scroll-mt-24 focus:outline-2 focus:outline-ring"
            >
              <ReviewLabel
                path="content/method"
                label="HTTPメソッド"
                inputId="specification-method"
                onReview={onReview}
              />
              {readOnly ? (
                <p className="text-sm">{content.method}</p>
              ) : (
                <Select
                  value={content.method ?? "GET"}
                  onValueChange={(value) => set("method", value)}
                >
                  <SelectTrigger id="specification-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "HEAD",
                        "OPTIONS",
                      ].map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>
            <TextField
              path="content/path"
              label="パス"
              value={content.path}
              onChange={(value) => set("path", value)}
              readOnly={readOnly}
              onReview={onReview}
              maxLength={1000}
              placeholder="例: /auth/login…"
            />
          </div>
          <TextField
            path="content/authentication"
            label="認証方法"
            value={content.authentication}
            onChange={(value) => set("authentication", value)}
            readOnly={readOnly}
            onReview={onReview}
            placeholder="例: ログイン済みセッションが必要…"
          />
          <TextField
            path="content/authorization"
            label="操作できる人・権限"
            value={content.authorization}
            onChange={(value) => set("authorization", value)}
            readOnly={readOnly}
            onReview={onReview}
            placeholder="例: このプロジェクトの編集権限を持つメンバー…"
          />
          <Fields
            title="リクエスト項目"
            help="呼び出す側が渡す情報です。必須条件と入力規則を具体化します。"
            path="content/request_fields"
            rows={content.request_fields ?? []}
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("request_fields", rows)}
          />
          <Fields
            title="レスポンス項目"
            help="呼び出した結果として返す情報です。"
            path="content/response_fields"
            rows={content.response_fields ?? []}
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("response_fields", rows)}
          />
          <Rules
            title="成功・エラー時の応答"
            help="成功だけでなく、入力エラー・権限不足・競合時の応答も整理します。"
            path="content/responses"
            rows={content.responses ?? []}
            nameLabel="HTTPステータス・エラーコード"
            destinationLabel="応答の例"
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("responses", rows)}
          />
        </>
      ) : (
        <>
          <TextField
            path="content/route"
            label="画面URL・識別子"
            value={content.route}
            onChange={(value) => set("route", value)}
            readOnly={readOnly}
            onReview={onReview}
            maxLength={1000}
            placeholder="例: /login…"
          />
          <TextField
            path="content/audience"
            label="利用する人・操作権限"
            value={content.audience}
            onChange={(value) => set("audience", value)}
            readOnly={readOnly}
            onReview={onReview}
            placeholder="例: 未ログインの利用者…"
          />
          <TextField
            path="content/reference_url"
            label="デザイン・参考資料のURL（任意）"
            link
            value={content.reference_url}
            onChange={(value) => set("reference_url", value || null)}
            readOnly={readOnly}
            onReview={onReview}
            maxLength={2000}
            placeholder="例: https://www.figma.com/design/…"
          />
          <Fields
            title="入力・表示項目"
            help="画面に必要な情報を、入力するものと表示するものに分けて整理します。"
            path="content/fields"
            rows={content.fields ?? []}
            screen
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("fields", rows)}
          />
          <Rules
            title="操作・画面遷移"
            help="ボタンを押したとき、何を確認してどの状態・画面に進むかを書きます。"
            path="content/actions"
            rows={content.actions ?? []}
            nameLabel="操作名"
            destinationLabel="遷移先・完了後の状態"
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("actions", rows)}
          />
          <Rules
            title="状態ごとの表示"
            help="読込中、データなし、エラー、権限なし、完了時の表示を確認します。"
            path="content/states"
            rows={content.states ?? []}
            nameLabel="状態"
            readOnly={readOnly}
            onReview={onReview}
            onChange={(rows) => set("states", rows)}
          />
        </>
      )}
      <TextField
        path="content/notes"
        label="補足・まだ決まっていないこと"
        value={content.notes}
        onChange={(value) => set("notes", value)}
        multiline
        readOnly={readOnly}
        onReview={onReview}
        maxLength={20000}
      />
    </FieldGroup>
  );
}
