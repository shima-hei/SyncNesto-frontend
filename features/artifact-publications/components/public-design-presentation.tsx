"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MarkdownImage } from "@/components/shared/forms/markdown-image";
import { MockupPreviewFrame } from "@/features/specifications/components/workspace/mockup-preview-frame";
import type { Values } from "@/features/specifications/lib/specification";
import type { HtmlMockup } from "@/lib/api/generated/model";
import { bodyImagePrefix } from "@/lib/markdown-body-images";
import { readSharedDesignMockup } from "../lib/access-api";

const FixedWireframes = dynamic(() =>
  import("@/features/specifications/components/workspace/wireframe-editor").then(
    (module) => module.WireframeEditor,
  ),
);

const FixedDetails = dynamic(() =>
  import("@/features/specifications/components/workspace/design-details").then(
    (module) => module.DesignDetails,
  ),
);

const detailTabs = {
  api: [
    ["request", "リクエスト"],
    ["responses", "レスポンス"],
    ["processing", "処理仕様"],
    ["security", "認証・認可"],
  ],
  database: [
    ["columns", "カラム"],
    ["constraints", "制約"],
    ["indexes", "インデックス"],
    ["relationships", "リレーション"],
  ],
} as const;

type SharedScope = {
  publicationId: string;
  nodeId: string;
  revision: string;
};

function SharedMockups({
  items,
  scope,
  preferred,
}: {
  items: HtmlMockup[];
  scope: SharedScope;
  preferred?: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState(preferred ?? items[0]?.id);
  const [requested, setRequested] = useState(false);
  const item = items.find((mockup) => mockup.id === selected);
  const { publicationId, nodeId, revision } = scope;
  const preview = useQuery({
    queryKey: [
      "shared-design-mockup",
      publicationId,
      nodeId,
      revision,
      selected,
    ],
    queryFn: ({ signal }) =>
      readSharedDesignMockup(
        publicationId,
        nodeId,
        selected!,
        { revision },
        { signal },
      ),
    enabled: Boolean(requested && selected),
    gcTime: 0,
    retry: false,
  });
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium" htmlFor={id}>
          HTMLモックアップ
        </label>
        <select
          id={id}
          value={selected}
          className="h-8 max-w-full rounded-md border bg-background px-2 text-sm"
          onChange={(event) => {
            setRequested(false);
            setSelected(event.target.value);
          }}
        >
          {items.map((mockup) => (
            <option key={mockup.id} value={mockup.id}>
              {mockup.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!selected || preview.isFetching}
          onClick={() =>
            requested ? void preview.refetch() : setRequested(true)
          }
        >
          固定版プレビューを表示
        </Button>
      </div>
      {preview.isFetching && (
        <p role="status" className="text-sm">
          プレビューを読み込み中…
        </p>
      )}
      <FormApiError error={preview.error} />
      {requested && item && preview.data && !preview.isError && (
        <div className="min-w-0 overflow-auto rounded-md border bg-muted/30 p-2">
          <MockupPreviewFrame
            document={preview.data.document}
            width={item.width}
            height={item.height}
          />
        </div>
      )}
    </section>
  );
}

export function PublicDesignPresentation({
  values,
  version,
  scope,
}: {
  values: Values;
  version: number;
  scope?: SharedScope;
}) {
  const [open, setOpen] = useState(false);
  const { content } = values;
  if (content.type !== "screen") {
    const tabs = detailTabs[content.type];
    return (
      <details
        className="min-w-0 rounded-md border p-3"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium">
          {content.type === "api" ? "固定版のAPI定義" : "固定版のテーブル定義"}
        </summary>
        {open && (
          <Tabs defaultValue={tabs[0][0]} className="mt-3 min-w-0">
            <TabsList className="h-auto w-fit max-w-full flex-wrap justify-start">
              {tabs.map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map(([value]) => (
              <TabsContent key={value} className="min-w-0" value={value}>
                <FixedDetails
                  values={values}
                  revision={version}
                  tab={value}
                  readOnly
                  onChange={() => undefined}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </details>
    );
  }
  const representative = content.representative_preview;
  const image =
    representative?.kind === "image" ? representative.target_id : undefined;
  const artboards = content.artboards ?? [];
  const firstArtboard =
    representative?.kind === "wireframe"
      ? artboards.find((item) => item.id === representative.target_id)
      : undefined;
  if (!(artboards.length || (scope && content.mockups?.length) || image))
    return null;
  const mockups = scope && Boolean(content.mockups?.length) && (
    <SharedMockups
      scope={scope}
      items={content.mockups ?? []}
      preferred={
        representative?.kind === "html" ? representative.target_id : undefined
      }
    />
  );
  return (
    <details
      className="min-w-0 rounded-md border p-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        固定版の画面レイアウト
      </summary>
      {open && (
        <div className="mt-3 min-w-0 space-y-4">
          {image && (
            <MarkdownImage
              src={`${bodyImagePrefix}${image}`}
              alt="代表プレビューの参考画像"
              inert
            />
          )}
          {representative?.kind === "html" && mockups}
          {Boolean(artboards.length) && (
            <FixedWireframes
              items={
                firstArtboard
                  ? [
                      firstArtboard,
                      ...artboards.filter(
                        (item) => item.id !== firstArtboard.id,
                      ),
                    ]
                  : artboards
              }
              fields={content.fields ?? []}
              events={content.actions ?? []}
              states={content.states ?? []}
              readOnly
              initialPreview
              canRegisterParts={false}
              onChange={() => undefined}
              onCreateReference={() => undefined}
            />
          )}
          {representative?.kind !== "html" && mockups}
        </div>
      )}
    </details>
  );
}
