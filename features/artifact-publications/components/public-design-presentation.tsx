"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MockupPreviewFrame } from "@/features/specifications/components/workspace/mockup-preview-frame";
import type { Content } from "@/features/specifications/lib/specification";
import type { HtmlMockup } from "@/lib/api/generated/model";
import { readSharedDesignMockup } from "../lib/access-api";

const FixedWireframes = dynamic(() =>
  import("@/features/specifications/components/workspace/wireframe-editor").then(
    (module) => module.WireframeEditor,
  ),
);

type SharedScope = {
  publicationId: string;
  nodeId: string;
  revision: string;
};

function SharedMockups({
  items,
  scope,
}: {
  items: HtmlMockup[];
  scope: SharedScope;
}) {
  const id = useId();
  const [selected, setSelected] = useState(items[0]?.id);
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
  content,
  scope,
}: {
  content: Content;
  scope?: SharedScope;
}) {
  const [open, setOpen] = useState(false);
  if (
    content.type !== "screen" ||
    !(content.artboards?.length || (scope && content.mockups?.length))
  )
    return null;
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
          {Boolean(content.artboards?.length) && (
            <FixedWireframes
              items={content.artboards ?? []}
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
          {scope && Boolean(content.mockups?.length) && (
            <SharedMockups scope={scope} items={content.mockups ?? []} />
          )}
        </div>
      )}
    </details>
  );
}
