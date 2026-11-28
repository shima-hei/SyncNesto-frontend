"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type {
  DesignImpactUpdate,
  DesignMapping,
  SpecificationLinkRead,
} from "@/lib/api/generated/model";
import { readSpecification } from "../../lib/api";
import {
  relatedHref,
  specificationHref,
  specificationKeys,
  type Content,
} from "../../lib/specification";
import {
  designKey,
  readDesignDiagram,
  readDesignImpact,
  updateDesignImpact,
} from "../../lib/workspace";

const select =
  "h-8 min-w-0 max-w-full rounded-md border bg-background px-2 text-sm";
const pathPart = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");

function fieldId(value: unknown) {
  if (value === null || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const id = row.id ?? row["x-syncnesto-id"];
  return typeof id === "string" ? id : undefined;
}

function paths(
  value: unknown,
  prefix = "content",
  label = "",
): { path: string; label: string }[] {
  if (!value || typeof value !== "object")
    return prefix === "content" ? [] : [{ path: prefix, label }];
  if (Array.isArray(value))
    return value.flatMap((item) => {
      const id = fieldId(item);
      if (!id) return [];
      const name = typeof item.name === "string" && item.name ? item.name : id;
      return paths(item, `${prefix}/${pathPart(id)}`, `${label} / ${name}`);
    });
  if (prefix.split("/").length > 12) return [];
  return Object.entries(value)
    .filter(
      ([key]) =>
        ![
          "mappings",
          "id",
          "mockups",
          "artboards",
          "description",
          "x-syncnesto-id",
          "x-syncnesto-property-order",
        ].includes(key),
    )
    .flatMap(([key, child]) =>
      paths(
        child,
        `${prefix}/${pathPart(prefix.endsWith("/properties") ? (fieldId(child) ?? key) : key)}`,
        label ? `${label} / ${key}` : key,
      ),
    );
}

export function DesignMappings({
  projectId,
  id,
  content,
  readOnly,
  onChange,
}: {
  projectId: number;
  id: number;
  content: Content;
  readOnly: boolean;
  onChange: (value: Content) => void;
}) {
  const [kind, setKind] = useState<Content["type"]>("api");
  const [target, setTarget] = useState(0);
  const [source, setSource] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [meaning, setMeaning] =
    useState<NonNullable<DesignMapping["meaning"]>>("maps");
  const [note, setNote] = useState("");
  const list = useQuery({
    queryKey: [...designKey(projectId), "mapping", kind],
    queryFn: () => readDesignDiagram(projectId, { kind, page_size: 100 }),
    enabled: !readOnly,
  });
  const detail = useQuery({
    queryKey: specificationKeys.detail(projectId, target),
    queryFn: () => readSpecification(projectId, target),
    enabled: !readOnly && target > 0,
  });
  const mappings = content.mappings ?? [];
  return (
    <section className="space-y-3 border-t pt-3">
      <h2 className="text-sm font-semibold">項目の対応・変換</h2>
      {!readOnly && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!target || !source || !targetPath) return;
            onChange({
              ...content,
              mappings: [
                ...mappings,
                {
                  id: crypto.randomUUID(),
                  source_path: source,
                  target_id: target,
                  target_path: targetPath,
                  meaning,
                  name: note,
                },
              ],
            });
            setSource("");
            setTargetPath("");
            setNote("");
          }}
        >
          <select
            aria-label="対応元の項目"
            className={select}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">対応元の項目</option>
            {paths(content)
              .slice(0, 700)
              .map((item) => (
                <option key={item.path} value={item.path}>
                  {item.label}
                </option>
              ))}
          </select>
          <select
            aria-label="関連の意味"
            className={select}
            value={meaning}
            onChange={(event) =>
              setMeaning(event.target.value as typeof meaning)
            }
          >
            <option value="maps">値の対応</option>
            <option value="implements">実現</option>
            <option value="calls">呼び出し</option>
            <option value="reads">参照</option>
            <option value="writes">更新</option>
            <option value="verifies">検証</option>
          </select>
          <select
            aria-label="対応先の設計種別"
            className={select}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as typeof kind);
              setTarget(0);
              setTargetPath("");
            }}
          >
            <option value="api">API</option>
            <option value="screen">画面</option>
            <option value="database">DB</option>
          </select>
          <select
            aria-label="対応先の設計"
            className={select}
            value={target}
            onChange={(event) => {
              setTarget(Number(event.target.value));
              setTargetPath("");
            }}
          >
            <option value={0}>対応先の設計</option>
            {list.data?.nodes
              .filter((item) => item.id !== id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
          <select
            aria-label="対応先の項目"
            className={select}
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
          >
            <option value="">対応先の項目</option>
            {paths(detail.data?.content)
              .slice(0, 700)
              .map((item) => (
                <option key={item.path} value={item.path}>
                  {item.label}
                </option>
              ))}
          </select>
          <Input
            aria-label="変換の補足"
            className="h-8 max-w-52"
            maxLength={200}
            placeholder="変換・条件・固定値"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            size="sm"
            type="submit"
            variant="outline"
            disabled={!target || !source || !targetPath}
          >
            対応を追加
          </Button>
        </form>
      )}
      <FormApiError error={list.error ?? detail.error} />
      <ul className="divide-y">
        {mappings.map((item) => (
          <li
            className="flex flex-wrap items-center gap-3 py-2 text-sm"
            key={item.id}
          >
            <span className="font-mono text-xs">{item.source_path}</span>
            <span aria-hidden="true">→</span>
            <Link
              href={`${specificationHref(projectId, item.target_id)}?focus=${encodeURIComponent(item.target_path)}`}
              className="text-primary hover:underline"
            >
              {item.target_path}
            </Link>
            <span>{item.name}</span>
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...content,
                    mappings: mappings.filter((value) => value.id !== item.id),
                  })
                }
              >
                削除
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!mappings.length && (
        <p className="text-sm text-muted-foreground">
          項目の対応はまだありません。
        </p>
      )}
    </section>
  );
}

export function DesignImpactPanel({
  projectId,
  id,
  canEdit,
}: {
  projectId: number;
  id: number;
  canEdit: boolean;
}) {
  const cache = useQueryClient();
  const key = [...specificationKeys.detail(projectId, id), "impact"];
  const query = useQuery({
    queryKey: key,
    queryFn: () => readDesignImpact(projectId, id),
  });
  const save = useMutation({
    mutationFn: (data: DesignImpactUpdate) =>
      updateDesignImpact(projectId, id, data),
    onSuccess: (result) => cache.setQueryData(key, result),
  });
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">変更影響</h2>
      {query.isPending && <p role="status">影響を確認中…</p>}
      <FormApiError error={query.error ?? save.error} />
      {query.data && (
        <>
          <p className="text-sm text-muted-foreground">
            {query.data.base_version
              ? `比較元 版${query.data.base_version} → 現在 版${query.data.source_version}`
              : query.data.items.length
                ? `現在 版${query.data.source_version} · 共通定義との比較`
                : "比較できる変更はありません。"}
          </p>
          <ul className="divide-y">
            {query.data.items.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {
                      { error: "エラー", warning: "警告", review: "要確認" }[
                        item.level
                      ]
                    }
                    {item.target_version
                      ? ` · 対象版 ${item.target_version}`
                      : ""}
                  </p>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={
                      relatedHref(projectId, item as SpecificationLinkRead) ??
                      specificationHref(projectId)
                    }
                  >
                    {item.title}
                  </Link>
                  <p>{item.detail}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button
                      variant={
                        item.status === "confirmed" ? "secondary" : "outline"
                      }
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          key: item.key,
                          status: "confirmed",
                          source_version: query.data.source_version,
                        })
                      }
                    >
                      確認済み
                    </Button>
                    <Button
                      variant={
                        item.status === "needs_action" ? "secondary" : "outline"
                      }
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          key: item.key,
                          status: "needs_action",
                          source_version: query.data.source_version,
                        })
                      }
                    >
                      対応が必要
                    </Button>
                  </div>
                ) : (
                  <span>
                    {item.status === "confirmed"
                      ? "確認済み"
                      : item.status === "needs_action"
                        ? "対応が必要"
                        : "未確認"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!query.data.items.length && (
            <p className="text-sm">関連する確認項目はありません。</p>
          )}
        </>
      )}
    </section>
  );
}
