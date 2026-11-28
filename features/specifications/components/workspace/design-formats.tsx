"use client";

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type {
  CollectionRead,
  CollectionReadConfiguration,
  FormatExport,
  OpenApiChange,
} from "@/lib/api/generated/model";
import {
  downloadDesign,
  exportDdl,
  exportOpenApi,
  importOpenApi,
} from "../../lib/workspace";

export function DesignFormats({
  projectId,
  kind,
  collectionId,
  designId,
  revision,
  dataChanged,
}: {
  projectId: number;
  kind: "api" | "database";
  collectionId?: string;
  designId?: number;
  revision?: number;
  dataChanged?: boolean;
}) {
  const [output, setOutput] = useState<FormatExport | null>(null);
  const [copyState, setCopyState] = useState("");
  const load = useMutation({
    mutationFn: () =>
      (kind === "api" ? exportOpenApi : exportDdl)(projectId, {
        collection_id: collectionId,
        design_id: designId,
        revision,
      }),
    onSuccess: setOutput,
  });
  const text =
    kind === "api"
      ? output?.document
        ? JSON.stringify(output.document, null, 2)
        : ""
      : (output?.sql ?? "");
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={load.isPending || dataChanged}
          onClick={() => load.mutate()}
        >
          {revision ? `版 ${revision}` : "保存済み設計"}の
          {kind === "api" ? "OpenAPI" : "DDL"}を生成
        </Button>
        {text && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setCopyState("コピーしました");
                } catch {
                  setCopyState("コピーできませんでした");
                }
              }}
            >
              コピー
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadDesign(
                  kind === "api" ? "openapi.json" : "design.sql",
                  text,
                )
              }
            >
              ダウンロード
            </Button>
            {kind === "api" && output?.document && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const { stringify } = await import("yaml");
                  downloadDesign("openapi.yaml", stringify(output.document));
                }}
              >
                YAML
              </Button>
            )}
          </>
        )}
      </div>
      <FormApiError error={load.error} />
      {copyState && (
        <p role="status" className="text-xs">
          {copyState}
        </p>
      )}
      {!!output?.warnings?.length && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {output.warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
      {text && (
        <Textarea
          aria-label={kind === "api" ? "OpenAPI出力" : "DDL出力"}
          readOnly
          value={text}
          rows={14}
          className="font-mono text-xs"
        />
      )}
    </div>
  );
}

export function OpenApiImportPanel({
  projectId,
  collection,
  onImported,
}: {
  projectId: number;
  collection: CollectionRead;
  onImported: () => void;
}) {
  const field = useId();
  const [source, setSource] = useState("");
  const [plan, setPlan] = useState<OpenApiChange[] | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const [previewVersion, setPreviewVersion] = useState<number>();
  const process = useMutation({
    mutationFn: async (apply: boolean) => {
      if (!source.trim() || new TextEncoder().encode(source).length > 600_000)
        throw new Error("600KB以内のOpenAPIファイルを選択してください");
      const { parseDocument } = await import("yaml");
      const parsed = parseDocument(source, {
        schema: "core",
        strict: true,
        stringKeys: true,
        uniqueKeys: true,
      });
      if (parsed.errors.length || parsed.warnings.length)
        throw new Error("JSONまたはYAMLの構文・タグを確認してください");
      const document: unknown = parsed.toJS({ maxAliasCount: 0 });
      if (!document || typeof document !== "object" || Array.isArray(document))
        throw new Error("OpenAPI文書を指定してください");
      return importOpenApi(projectId, {
        collection_id: collection.id,
        collection_version: (apply ? previewVersion : collection.version) ?? 1,
        document: document as CollectionReadConfiguration,
        selections: apply ? selected : null,
      });
    },
    onSuccess: (result, apply) => {
      if (apply) {
        setPlan(null);
        setNotice(`${result.applied ?? 0}件を下書きへ反映しました。`);
        onImported();
      } else {
        setPreviewVersion(collection.version ?? 1);
        setPlan(result.changes);
        setSelected(
          Object.fromEntries(
            result.changes
              .filter(
                (change) => change.action === "add" || change.action === "edit",
              )
              .map((change) => [change.key, change.version ?? 0]),
          ),
        );
      }
    },
  });
  return (
    <details className="space-y-3 rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        OpenAPIをインポート
      </summary>
      <label htmlFor={field} className="block text-sm">
        JSON・YAMLファイル（{collection.name}）
      </label>
      <input
        id={field}
        type="file"
        className="max-w-full text-sm"
        accept=".json,.yaml,.yml"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          setPlan(null);
          if (file.size > 600_000) {
            setNotice("600KB以内のファイルを選択してください。");
            return;
          }
          try {
            setSource(await file.text());
            setNotice("");
          } catch {
            setNotice("ファイルを読み込めませんでした。");
          }
        }}
      />
      <Textarea
        aria-label="OpenAPI原文"
        className="font-mono text-xs"
        value={source}
        rows={6}
        maxLength={600_000}
        onChange={(event) => {
          setSource(event.target.value);
          setPlan(null);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={!source.trim() || process.isPending}
        onClick={() => process.mutate(false)}
      >
        差分を確認
      </Button>
      {plan && (
        <div className="space-y-2">
          <p className="text-sm">
            選択した操作と、ファイル内の仕様セット設定を下書きに反映します。
          </p>
          <ul className="divide-y">
            {plan.map((item) => (
              <li key={item.key} className="py-2 text-sm">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={Object.hasOwn(selected, item.key)}
                    disabled={
                      item.action === "same" || item.action === "retain"
                    }
                    onChange={(event) => {
                      const next = { ...selected };
                      if (event.target.checked)
                        next[item.key] = item.version ?? 0;
                      else delete next[item.key];
                      setSelected(next);
                    }}
                  />
                  <span>
                    {
                      {
                        add: "追加",
                        edit: "変更",
                        same: "同一",
                        retain: "既存を保持",
                      }[item.action]
                    }
                  </span>
                  <strong>{item.key}</strong>
                  <span>{item.title}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            disabled={process.isPending || !Object.keys(selected).length}
            onClick={() => process.mutate(true)}
          >
            選択内容を反映
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <FormApiError error={process.error} />
    </details>
  );
}
