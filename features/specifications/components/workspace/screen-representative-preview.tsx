"use client";

import dynamic from "next/dynamic";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { MarkdownImage } from "@/components/shared/forms/markdown-image";
import { discardBodyImage, uploadBodyImage } from "@/lib/api/body-image-upload";
import type {
  RepresentativePreview,
  ScreenSpecification,
} from "@/lib/api/generated/model";
import { bodyImagePrefix } from "@/lib/markdown-body-images";
import { previewMockup } from "../../lib/workspace";
import { MockupPreviewFrame } from "./mockup-preview-frame";

const WireframePreview = dynamic(() =>
  import("./wireframe-editor").then((module) => module.WireframeEditor),
);

export function ScreenRepresentativePreview({
  projectId,
  content,
  readOnly,
  onChange,
}: {
  projectId: number;
  content: ScreenSpecification;
  readOnly: boolean;
  onChange: (value: RepresentativePreview | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const latest = useRef({ onChange, projectId });
  const mounted = useRef(false);
  useLayoutEffect(() => {
    latest.current = { onChange, projectId };
  }, [onChange, projectId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const endpoint = `/projects/${projectId}/body-images/specification`;
      const image = await uploadBodyImage(file, endpoint);
      if (!mounted.current || latest.current.projectId !== projectId) {
        discardBodyImage(endpoint, image.id);
        return;
      }
      latest.current.onChange({ kind: "image", target_id: image.id });
    },
  });
  const preview = useMutation({
    mutationFn: (id: string) => {
      const mockup = (content.mockups ?? []).find((item) => item.id === id);
      if (!mockup) throw new Error("モックアップが見つかりません。");
      return previewMockup(projectId, mockup);
    },
  });
  const choice = content.representative_preview;
  const board =
    choice?.kind === "wireframe"
      ? content.artboards?.find((item) => item.id === choice.target_id)
      : undefined;
  const mockup =
    choice?.kind === "html"
      ? content.mockups?.find((item) => item.id === choice.target_id)
      : undefined;
  if (readOnly && !choice) return null;
  return (
    <details
      className="min-w-0 rounded-md border px-3 py-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        代表プレビュー
        {choice ? ` · ${board?.name ?? mockup?.name ?? "参考画像"}` : ""}
      </summary>
      {open && (
        <div className="mt-3 min-w-0 space-y-3">
          {!readOnly && (
            <div className="flex flex-wrap items-end gap-3">
              <label htmlFor={id} className="grid gap-1 text-xs">
                表示するプレビュー
                <select
                  id={id}
                  value={choice ? `${choice.kind}:${choice.target_id}` : ""}
                  disabled={upload.isPending}
                  className="h-8 max-w-full rounded-md border bg-background px-2 text-sm"
                  onChange={(event) => {
                    const value = event.target.value;
                    const board = content.artboards?.find(
                      (item) => `wireframe:${item.id}` === value,
                    );
                    const html = content.mockups?.find(
                      (item) => `html:${item.id}` === value,
                    );
                    preview.reset();
                    if (board?.id)
                      onChange({ kind: "wireframe", target_id: board.id });
                    else if (html?.id)
                      onChange({ kind: "html", target_id: html.id });
                    else if (!value) onChange(null);
                  }}
                >
                  <option value="">設定なし</option>
                  <optgroup label="ワイヤーフレーム">
                    {content.artboards?.map(
                      (item) =>
                        item.id && (
                          <option value={`wireframe:${item.id}`} key={item.id}>
                            {item.name}
                          </option>
                        ),
                    )}
                  </optgroup>
                  <optgroup label="HTMLモックアップ">
                    {content.mockups?.map(
                      (item) =>
                        item.id && (
                          <option value={`html:${item.id}`} key={item.id}>
                            {item.name}
                          </option>
                        ),
                    )}
                  </optgroup>
                  {choice?.kind === "image" && (
                    <option value={`image:${choice.target_id}`}>
                      参考画像
                    </option>
                  )}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-xs">
                参考画像をアップロード
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="h-8 max-w-64"
                  disabled={upload.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate(file);
                    event.target.value = "";
                  }}
                />
              </label>
              {upload.isPending && (
                <p role="status" className="text-sm">
                  画像をアップロード中…
                </p>
              )}
            </div>
          )}
          <FormApiError error={upload.error ?? preview.error} />
          {choice?.kind === "image" && (
            <MarkdownImage
              src={`${bodyImagePrefix}${choice.target_id}`}
              alt="代表プレビューの参考画像"
              inert
            />
          )}
          {board && (
            <WireframePreview
              key={board.id}
              items={[board]}
              fields={content.fields ?? []}
              events={content.actions ?? []}
              states={content.states ?? []}
              canRegisterParts={false}
              onChange={() => undefined}
              onCreateReference={() => undefined}
              initialPreview
              readOnly
            />
          )}
          {mockup?.id && (
            <div className="min-w-0 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={preview.isPending}
                onClick={() => preview.mutate(mockup.id!)}
              >
                HTMLをプレビュー
              </Button>
              {preview.data && preview.variables === mockup.id && (
                <div className="min-w-0 overflow-auto rounded-md border bg-muted/30 p-2">
                  <MockupPreviewFrame
                    document={preview.data.document}
                    width={mockup.width}
                    height={mockup.height}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
