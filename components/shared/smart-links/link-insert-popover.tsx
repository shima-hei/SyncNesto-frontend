"use client";

import {
  CornerDownLeftIcon,
  ExternalLinkIcon,
  Link2Icon,
  SearchIcon,
  UnlinkIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { findSmartLinksSearchSmartLinksGet } from "@/lib/api/generated/search/search";
import type { FindSmartLinksSearchSmartLinksGetGroup } from "@/lib/api/generated/model/findSmartLinksSearchSmartLinksGetGroup";
import { editorLinks } from "@/lib/smart-links/editor-links";
import {
  makeLinkMarkup,
  safeLinkDestination,
  type LinkDisplay,
} from "@/lib/smart-links/markup";
import {
  parseSmartLink,
  smartLinkKey,
  smartLinkPath,
} from "@/lib/smart-links/reference";
import {
  useSmartLink,
  useSmartLinkScope,
} from "@/lib/smart-links/use-smart-link";
import { smartLinkKind } from "./smart-link-kind";
import { useSmartLinkOrigin } from "./smart-link";

const groups = [
  { value: undefined, label: "すべて" },
  { value: "task", label: "タスク" },
  { value: "requirement", label: "要件" },
  { value: "specification", label: "設計" },
  { value: "test", label: "テスト" },
  { value: "document", label: "資料" },
  { value: "project", label: "案件" },
] as const;

export type LinkEditorChange = {
  value: string;
  start: number;
  end: number;
  replacement: string;
};

type Selection = {
  input: HTMLTextAreaElement;
  source: string;
  start: number;
  end: number;
  href: string | null;
  label: string;
  display: LinkDisplay;
};

function captureSelection(input: HTMLTextAreaElement): Selection {
  const { value: source, selectionStart, selectionEnd } = input;
  const link = editorLinks(source).find(({ start, end }) => {
    const inside =
      selectionStart === selectionEnd
        ? selectionStart >= start && selectionStart < end
        : selectionStart >= start && selectionEnd <= end;
    return inside;
  });
  return {
    input,
    source,
    start: link?.start ?? selectionStart,
    end: link?.end ?? selectionEnd,
    href: link?.href ?? null,
    label: link
      ? link.display === "label"
        ? link.text
        : ""
      : source.slice(selectionStart, selectionEnd),
    display: link?.display ?? "auto",
  };
}

export function LinkInsertPopover({
  editor,
  onChange,
  disabled,
  iconOnly = false,
  autoTitleForUrl,
}: {
  editor: () => HTMLTextAreaElement | null;
  onChange: (change: LinkEditorChange) => boolean | void;
  disabled?: boolean;
  iconOnly?: boolean;
  autoTitleForUrl?: (href: string) => boolean;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [group, setGroup] = useState<FindSmartLinksSearchSmartLinksGetGroup>();
  const [error, setError] = useState("");
  const debounceComposing = useRef(false);
  const imeEndedAt = useRef(0);
  const [searchText, setSearchText] = useState("");
  const caption = useId();
  const origin = useSmartLinkOrigin();
  const pathname = usePathname();
  const projectId =
    Number(/^\/projects\/joined\/(\d+)/.exec(pathname ?? "")?.[1]) || undefined;
  const { scope } = useSmartLinkScope();
  const typed = query.trim();
  const term = typed.slice(0, 200);
  const looksLikeUrl = /^(?:\/|[a-z][a-z\d+.-]*:)/i.test(typed);
  const destination = looksLikeUrl ? safeLinkDestination(typed) : null;
  const parsed =
    destination && origin && !autoTitleForUrl
      ? parseSmartLink(destination, origin)
      : null;
  const autoTitle = Boolean(
    parsed || (destination && autoTitleForUrl?.(destination)),
  );
  const canSearch = Boolean(scope && !autoTitleForUrl);
  const suggestedLink = useSmartLink(parsed, Boolean(selection));
  const searching = useQuery({
    queryKey: ["smart-link-picker", scope, projectId, group, searchText],
    queryFn: ({ signal }) =>
      findSmartLinksSearchSmartLinksGet(
        { q: searchText, group, preferred_project: projectId },
        { signal },
      ),
    enabled: Boolean(
      selection &&
      canSearch &&
      searchText &&
      !looksLikeUrl &&
      searchText === term,
    ),
    staleTime: 5_000,
    gcTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!selection || looksLikeUrl) return;
    const handle = setTimeout(() => {
      if (!debounceComposing.current) setSearchText(term);
    }, 220);
    return () => clearTimeout(handle);
  }, [looksLikeUrl, selection, term]);

  const changeOpen = (open: boolean) => {
    if (!open) {
      setSelection(null);
      return;
    }
    const input = editor();
    if (!input || input.disabled || input.readOnly) return;
    const captured = captureSelection(input);
    setSelection(captured);
    setQuery(captured.href ?? "");
    setLabel(captured.label);
    setShowUrl(captured.display === "url");
    setSearchText("");
    setGroup(undefined);
    setError("");
    debounceComposing.current = false;
    imeEndedAt.current = 0;
  };

  const apply = (replacement: string) => {
    if (!selection) return;
    if (selection.source !== selection.input.value) {
      setError("本文が変更されました。リンク挿入を開き直してください。");
      return;
    }
    const { source, start, end, input } = selection;
    const value = source.slice(0, start) + replacement + source.slice(end);
    if (
      (input.maxLength >= 0 && value.length > input.maxLength) ||
      onChange({ value, start, end, replacement }) === false
    ) {
      setError("本文の文字数制限を超えています。");
      return;
    }
    setSelection(null);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(
        start + replacement.length,
        start + replacement.length,
      );
    });
  };

  const insert = (href: string, internal: boolean) => {
    apply(
      makeLinkMarkup(
        href,
        label,
        showUrl ? "url" : label.trim() ? "label" : internal ? "auto" : "url",
      ),
    );
  };

  const rows =
    canSearch && searchText === term && !looksLikeUrl && !searching.isError
      ? (searching.data ?? [])
      : [];
  return (
    <Popover open={Boolean(selection)} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon-sm" : "sm"}
          disabled={disabled}
          aria-label="リンクを挿入"
          title="リンクを挿入"
        >
          <Link2Icon aria-hidden="true" />
          {iconOnly ? null : "リンク"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={10}
        aria-labelledby={caption}
        className="w-96 max-w-[calc(100vw-1.25rem)] gap-2 p-2.5"
      >
        <p className="px-1 text-sm font-medium" id={caption}>
          {selection?.href ? "リンクを編集" : "リンクを挿入"}
        </p>
        <Command shouldFilter={false} loop className="bg-transparent">
          <CommandInput
            aria-label={autoTitleForUrl ? "URL" : "成果物名・ID・URL"}
            placeholder={
              autoTitleForUrl ? "URLを入力…" : "成果物名・ID・URLを入力…"
            }
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              setError("");
            }}
            onCompositionStart={() => {
              debounceComposing.current = true;
            }}
            onCompositionEnd={() => {
              debounceComposing.current = false;
              imeEndedAt.current = performance.now();
              if (!looksLikeUrl) setSearchText(term);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.nativeEvent.isComposing ||
                  debounceComposing.current ||
                  event.keyCode === 229 ||
                  (imeEndedAt.current > 0 &&
                    performance.now() - imeEndedAt.current < 80))
              ) {
                event.stopPropagation();
              }
            }}
          />
          {!looksLikeUrl && canSearch ? (
            <div
              className="flex flex-wrap gap-0.5 px-1 pb-1"
              aria-label="成果物の絞り込み"
            >
              {groups.map((option) => (
                <Button
                  key={option.label}
                  size="xs"
                  variant={option.value === group ? "secondary" : "ghost"}
                  type="button"
                  aria-pressed={option.value === group}
                  onClick={() => setGroup(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : null}
          <CommandList aria-label="リンク候補" className="max-h-64">
            {destination ? (
              <CommandItem
                value={destination}
                onSelect={() => insert(destination, autoTitle)}
              >
                <ExternalLinkIcon aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    このURLを挿入
                  </span>
                  <span className="block truncate">
                    {suggestedLink.data && !suggestedLink.isError
                      ? [suggestedLink.data.code, suggestedLink.data.title]
                          .filter(Boolean)
                          .join(" ")
                      : destination}
                  </span>
                </span>
                <CornerDownLeftIcon aria-hidden="true" />
              </CommandItem>
            ) : looksLikeUrl ? (
              <p className="px-2 py-2 text-xs text-destructive">
                http:// または https:// のURLを入力してください。
              </p>
            ) : rows.length ? (
              rows.map((item) => {
                const { icon: KindIcon, label: category } = smartLinkKind(item);
                return (
                  <CommandItem
                    key={smartLinkKey(item)}
                    value={smartLinkKey(item)}
                    onSelect={() => insert(smartLinkPath(item), true)}
                  >
                    <KindIcon
                      className="text-[var(--status-info-fg)]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-muted-foreground">
                        {[
                          item.code || category,
                          item.project_id !== projectId
                            ? item.project_name
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="block truncate">{item.title}</span>
                    </span>
                    <CornerDownLeftIcon aria-hidden="true" />
                  </CommandItem>
                );
              })
            ) : (
              <p
                role="status"
                className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"
              >
                <SearchIcon className="size-3.5" aria-hidden="true" />
                {!canSearch
                  ? "URLを入力してください"
                  : !typed
                    ? "成果物名またはURLを入力してください"
                    : searching.isError
                      ? "成果物を取得できませんでした"
                      : searching.isFetching || term !== searchText
                        ? "検索中…"
                        : "一致する成果物がありません"}
              </p>
            )}
          </CommandList>
        </Command>
        {destination || label || selection?.href ? (
          <div className="grid gap-2 border-t pt-2">
            <label className="grid gap-1 px-1 text-xs text-muted-foreground">
              表示テキスト
              <Input
                className="h-8"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="省略するとタイトルまたはURLを表示"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!event.nativeEvent.isComposing && destination)
                      insert(destination, autoTitle);
                  }
                }}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-1 px-1">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={showUrl}
                  onChange={(event) => setShowUrl(event.target.checked)}
                />
                URLをそのまま表示
              </label>
              {selection?.href ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => apply(selection.label)}
                >
                  <UnlinkIcon aria-hidden="true" />
                  {selection.label ? "リンクを解除" : "リンクを削除"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="px-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
