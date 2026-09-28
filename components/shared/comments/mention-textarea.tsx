"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import { UserAvatar } from "@/components/shared/display/user-avatar";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useListProjectMemberUsersProjectsProjectIdMemberUsersGet } from "@/lib/api/generated/projects/projects";
import type { UserSummary } from "@/lib/api/generated/model/userSummary";
import {
  getMentionQuery,
  reconcileMentions,
  type Mention,
  type MentionPermission,
  type MentionQuery,
} from "@/lib/comments/mentions";
import { cn } from "@/lib/utils";

import { CommentContent } from "./comment-content";

type MentionTextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  "value" | "onChange" | "ref"
> & {
  projectId: number;
  permission: MentionPermission;
  value: string;
  mentions?: Mention[];
  onChange: (body: string, mentions: Mention[]) => void;
};

const emptyMentions: Mention[] = [];

export function MentionTextarea({
  projectId,
  permission,
  value,
  mentions = emptyMentions,
  onChange,
  className,
  disabled,
  ...props
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const imeCommit = useRef(false);
  const editSelection = useRef<{
    start: number;
    end: number;
    inputType: string;
  } | null>(null);
  const [queryLocation, setActive] = useState<MentionQuery | null>(null);
  const active =
    queryLocation &&
    value.slice(queryLocation.start, queryLocation.end) ===
      `@${queryLocation.query}`
      ? queryLocation
      : null;
  const [selectedId, setSelectedId] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const queryText = active?.query ?? "";
  const helpId = useId();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const captureSelection = (event: InputEvent) => {
      editSelection.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        inputType: event.inputType,
      };
    };
    textarea.addEventListener("beforeinput", captureSelection);
    return () => textarea.removeEventListener("beforeinput", captureSelection);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryText), 150);
    return () => clearTimeout(timer);
  }, [queryText]);

  const query = useListProjectMemberUsersProjectsProjectIdMemberUsersGet(
    projectId,
    {
      q: debouncedQuery || undefined,
      limit: 30,
      mention_permission: permission,
    },
    { query: { enabled: active !== null && !disabled, retry: false } },
  );
  const waiting = queryText !== debouncedQuery || query.isFetching;
  const candidates = waiting ? [] : (query.data?.items ?? []);
  const selected =
    candidates.find((user) => String(user.id) === selectedId) ?? candidates[0];
  const selectedValue = selected ? String(selected.id) : "";

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    const sync = () => {
      const style = getComputedStyle(textarea);
      for (const property of [
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "letter-spacing",
        "padding-top",
        "padding-bottom",
        "padding-left",
        "padding-right",
        "border-top-width",
        "border-bottom-width",
        "border-left-width",
        "border-right-width",
        "word-break",
        "overflow-wrap",
        "tab-size",
        "text-align",
        "direction",
      ]) {
        highlight.style.setProperty(property, style.getPropertyValue(property));
      }
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [value, mentions, className]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (!active || disabled) {
      textarea.removeAttribute("aria-controls");
      textarea.removeAttribute("aria-activedescendant");
      return;
    }
    // Commandが生成した実際のIDを入力欄から参照する。
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      textarea.setAttribute("aria-controls", list.id);
      const option = list.querySelector<HTMLElement>(
        `[data-value="${selectedValue}"]`,
      );
      if (option) {
        textarea.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      } else {
        textarea.removeAttribute("aria-activedescendant");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [active, selectedValue, waiting, disabled]);

  function updateQuery(
    textarea: HTMLTextAreaElement,
    body = value,
    currentMentions = mentions,
  ) {
    if (
      composing.current ||
      textarea.selectionStart !== textarea.selectionEnd ||
      currentMentions.length >= 100
    ) {
      setActive(null);
      return;
    }
    setActive(getMentionQuery(body, textarea.selectionStart, currentMentions));
  }

  function choose(user: UserSummary) {
    if (!active || composing.current || imeCommit.current) return;
    const token = `@${user.name}`;
    const body =
      value.slice(0, active.start) + token + " " + value.slice(active.end);
    if (props.maxLength && body.length > props.maxLength) return;
    const nextMentions = reconcileMentions(value, body, mentions, active);
    nextMentions.push({
      user_id: user.id,
      display_name: user.name,
      start: active.start,
      end: active.start + token.length,
    });
    onChange(
      body,
      nextMentions.sort((a, b) => a.start - b.start),
    );
    setActive(null);
    setSelectedId("");
    const cursor = active.start + token.length + 1;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <Popover
      open={active !== null && !disabled}
      onOpenChange={(open) => {
        if (!open) setActive(null);
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          {mentions.length > 0 && (
            <div
              ref={highlightRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap rounded-lg border-solid border-transparent text-foreground"
            >
              <CommentContent body={value} mentions={mentions} />
              {"\n"}
            </div>
          )}
          <Textarea
            {...props}
            ref={textareaRef}
            disabled={disabled}
            value={value}
            aria-label={props["aria-label"] ?? "コメント"}
            aria-describedby={[props["aria-describedby"], helpId]
              .filter(Boolean)
              .join(" ")}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={active !== null && !disabled}
            className={cn(
              className,
              mentions.length > 0 &&
                "text-transparent caret-foreground selection:bg-primary/20",
            )}
            onChange={(event) => {
              const body = event.target.value;
              const selection = editSelection.current;
              if (
                selection &&
                selection.start === selection.end &&
                body.length < value.length
              ) {
                if (selection.inputType.endsWith("Backward"))
                  selection.start += body.length - value.length;
                else if (selection.inputType.endsWith("Forward"))
                  selection.end += value.length - body.length;
              }
              const nextMentions = reconcileMentions(
                value,
                body,
                mentions,
                editSelection.current,
              );
              editSelection.current = null;
              onChange(body, nextMentions);
              setSelectedId("");
              updateQuery(event.target, body, nextMentions);
            }}
            onClick={(event) => updateQuery(event.currentTarget)}
            onKeyUp={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                updateQuery(event.currentTarget);
            }}
            onScroll={(event) => {
              if (highlightRef.current) {
                highlightRef.current.scrollTop = event.currentTarget.scrollTop;
                highlightRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
              }
            }}
            onCompositionStart={() => {
              composing.current = true;
              setActive(null);
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              imeCommit.current = true;
              updateQuery(event.currentTarget, event.currentTarget.value);
              requestAnimationFrame(() => {
                imeCommit.current = false;
              });
            }}
            onKeyDown={(event) => {
              if (
                composing.current ||
                imeCommit.current ||
                event.nativeEvent.isComposing ||
                event.keyCode === 229 ||
                !active
              )
                return;
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setActive(null);
              } else if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                candidates.length
              ) {
                event.preventDefault();
                event.stopPropagation();
                const index = candidates.findIndex(
                  (user) => user.id === selected?.id,
                );
                const next =
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    candidates.length) %
                  candidates.length;
                setSelectedId(String(candidates[next].id));
              } else if (event.key === "Enter" && selected) {
                event.preventDefault();
                event.stopPropagation();
                choose(selected);
              }
            }}
          />
          <span id={helpId} className="sr-only">
            @でメンバーを検索。上下キーで移動、Enterで選択、Escapeで閉じます。
          </span>
        </div>
      </PopoverAnchor>
      <PopoverContent
        aria-label="メンション候補"
        align="start"
        side="bottom"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === textareaRef.current) event.preventDefault();
        }}
      >
        <Command
          shouldFilter={false}
          value={selectedValue}
          onValueChange={setSelectedId}
        >
          <CommandList ref={listRef} label="メンション候補">
            {waiting || query.isLoading ? (
              <p className="p-2 text-muted-foreground" role="status">
                検索中…
              </p>
            ) : query.error ? (
              <p className="p-2 text-destructive" role="alert">
                候補を取得できませんでした。
              </p>
            ) : !candidates.length ? (
              <p className="p-2 text-muted-foreground" role="status">
                候補がありません。
              </p>
            ) : (
              <CommandGroup>
                {candidates.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={String(user.id)}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => choose(user)}
                  >
                    <UserAvatar
                      name={user.name}
                      src={user.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
