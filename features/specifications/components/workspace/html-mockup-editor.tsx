"use client";

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type { HtmlMockup } from "@/lib/api/generated/model";
import { downloadDesign, previewMockup } from "../../lib/workspace";

const maxImageBytes = 65_000;

export function HtmlMockupEditor({
  projectId,
  items,
  onChange,
  readOnly,
  onReview,
}: {
  projectId: number;
  items: HtmlMockup[];
  onChange: (items: HtmlMockup[]) => void;
  readOnly: boolean;
  onReview?: (path: string) => void;
}) {
  const field = useId();
  const [selected, setSelected] = useState(items[0]?.id);
  const [mode, setMode] = useState<"split" | "code" | "preview">("split");
  const [notice, setNotice] = useState("");
  const item = items.find((value) => value.id === selected) ?? items[0];
  const preview = useMutation({
    mutationFn: (data: HtmlMockup) => previewMockup(projectId, data),
  });
  const activePreview =
    preview.variables?.id === item?.id ? preview.data : undefined;
  const update = (next: HtmlMockup) =>
    onChange(items.map((value) => (value.id === next.id ? next : value)));
  const add = (source?: HtmlMockup) => {
    const next = {
      ...source,
      id: crypto.randomUUID(),
      name: source ? `${source.name}（複製）` : "モックアップ",
      width: source?.width ?? 1024,
      height: source?.height ?? 650,
    };
    onChange([...items, next]);
    setSelected(next.id);
  };
  const fileText = async (file: File, property: "html" | "css") => {
    if (!item) return;
    const max = property === "html" ? 100_000 : 50_000;
    if (file.size > max) {
      setNotice("ファイルサイズが上限を超えています。");
      return;
    }
    try {
      update({ ...item, [property]: await file.text() });
      setNotice("");
    } catch {
      setNotice("ファイルを読み込めませんでした。");
    }
  };
  const imageFile = (file: File) => {
    if (!item) return;
    if (
      file.size > maxImageBytes ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setNotice("65KB以内のPNG・JPEG・WebP画像を選択してください。");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      const html = `${item.html ?? ""}\n<img src="${reader.result}" alt="">`;
      if (html.length > 100_000) {
        setNotice("HTMLの上限を超えるため追加できません。");
        return;
      }
      update({ ...item, html });
      setNotice("");
    });
    reader.addEventListener("error", () =>
      setNotice("画像を読み込めませんでした。"),
    );
    reader.readAsDataURL(file);
  };
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="HTMLモックアップ"
          className="h-8 max-w-56 rounded-md border bg-background px-2 text-sm"
          value={item?.id ?? ""}
          onChange={(event) => setSelected(event.target.value)}
        >
          {!items.length && <option value="">モックアップなし</option>}
          {items.map((value) => (
            <option value={value.id} key={value.id}>
              {value.name}
            </option>
          ))}
        </select>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => add()}>
            モックアップを追加
          </Button>
        )}
        {!readOnly && item && (
          <Button variant="ghost" size="sm" onClick={() => add(item)}>
            複製
          </Button>
        )}
        {!readOnly && item && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange(items.filter((value) => value.id !== item.id))
            }
          >
            削除
          </Button>
        )}
        {item && onReview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReview(`content/mockups/${item.id}/html`)}
          >
            指摘
          </Button>
        )}
      </div>
      {item && (
        <>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-56"
                aria-label="モックアップ名"
                value={item.name ?? ""}
                onChange={(event) =>
                  update({ ...item, name: event.target.value })
                }
              />
              <Input
                className="w-24"
                aria-label="プレビューの幅"
                type="number"
                min={240}
                max={3840}
                value={item.width ?? 1024}
                onChange={(event) =>
                  update({ ...item, width: Number(event.target.value) })
                }
              />
              <Input
                className="w-24"
                aria-label="プレビューの高さ"
                type="number"
                min={240}
                max={3840}
                value={item.height ?? 650}
                onChange={(event) =>
                  update({ ...item, height: Number(event.target.value) })
                }
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["split", "分割"],
                ["code", "コード"],
                ["preview", "プレビュー"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={mode === value ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={preview.isPending}
              onClick={() => preview.mutate(item)}
            >
              プレビューを更新
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadDesign("mockup.html.txt", item.html ?? "")}
            >
              HTML原本
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadDesign("mockup.css.txt", item.css ?? "")}
            >
              CSS原本
            </Button>
          </div>
          {(notice || activePreview?.css_blocked) && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice || "外部参照を含むCSSをプレビューから除外しました。"}
            </p>
          )}
          <FormApiError error={preview.error} />
          <div
            className={
              mode === "split" ? "grid min-w-0 gap-3 xl:grid-cols-2" : "min-w-0"
            }
          >
            {mode !== "preview" && (
              <div className="min-w-0 space-y-2">
                {(["html", "css"] as const).map((property) => (
                  <div className="space-y-1" key={property}>
                    <label
                      htmlFor={`${field}-${property}`}
                      className="text-sm font-medium"
                    >
                      {property.toUpperCase()}
                    </label>
                    <Textarea
                      id={`${field}-${property}`}
                      aria-label={property.toUpperCase()}
                      rows={9}
                      readOnly={readOnly}
                      className="font-mono text-xs"
                      maxLength={property === "html" ? 100_000 : 50_000}
                      value={item[property] ?? ""}
                      onChange={(event) =>
                        update({ ...item, [property]: event.target.value })
                      }
                      onPaste={(event) => {
                        const file = event.clipboardData.files[0];
                        if (!readOnly && property === "html" && file) {
                          event.preventDefault();
                          imageFile(file);
                        }
                      }}
                    />
                    {!readOnly && (
                      <input
                        aria-label={`${property.toUpperCase()}ファイル`}
                        type="file"
                        className="max-w-full text-xs"
                        accept={`.${property}`}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void fileText(file, property);
                        }}
                      />
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <input
                    type="file"
                    aria-label="モックアップ画像"
                    accept="image/png,image/jpeg,image/webp"
                    className="max-w-full text-xs"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) imageFile(file);
                    }}
                  />
                )}
              </div>
            )}
            {mode !== "code" && (
              <div className="min-w-0 overflow-auto rounded-md border bg-muted/30 p-2">
                {activePreview ? (
                  <iframe
                    title="HTMLモックアップの隔離プレビュー"
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={activePreview.document}
                    className="block bg-white"
                    width={item.width ?? 1024}
                    height={item.height ?? 650}
                  />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    「プレビューを更新」で表示
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
