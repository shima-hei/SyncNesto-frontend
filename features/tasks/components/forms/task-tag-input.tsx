"use client";

import { useMemo, useState } from "react";
import { PlusIcon, TagIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useTaskTags } from "../../hooks/use-task-tags";

type TaskTagInputProps = {
  projectId: number;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export function TaskTagInput({
  projectId,
  value,
  error,
  onChange,
}: TaskTagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { tags: tagOptions, isLoading } = useTaskTags(projectId);
  const selectedTags = useMemo(() => parseTags(value), [value]);
  const normalizedSelectedTags = useMemo(
    () => new Set(selectedTags.map((tag) => tag.toLowerCase())),
    [selectedTags]
  );
  const normalizedOptionTags = useMemo(
    () => new Set(tagOptions.map((tag) => tag.toLowerCase())),
    [tagOptions]
  );
  const searchText = search.trim().toLowerCase();
  const filteredOptions = tagOptions.filter(
    (tag) =>
      !normalizedSelectedTags.has(tag.toLowerCase()) &&
      (!searchText || tag.toLowerCase().includes(searchText))
  );
  const canCreateSearchTag =
    search.trim().length > 0 &&
    !normalizedSelectedTags.has(searchText) &&
    !normalizedOptionTags.has(searchText);

  const updateTags = (tags: string[]) => {
    onChange(tags.join(", "));
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim();

    if (!normalizedTag) {
      return;
    }

    if (normalizedSelectedTags.has(normalizedTag.toLowerCase())) {
      setSearch("");
      return;
    }

    updateTags([...selectedTags, normalizedTag]);
    setSearch("");
  };

  const removeTag = (tag: string) => {
    updateTags(selectedTags.filter((selectedTag) => selectedTag !== tag));
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>タグ</FieldLabel>
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2",
            error ? "border-destructive" : "border-input"
          )}
        >
          {selectedTags.length ? (
            selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  type="button"
                  className="rounded-full"
                  onClick={() => removeTag(tag)}
                >
                  <XIcon data-icon="inline-end" />
                  <span className="sr-only">{tag}を削除</span>
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              タグは未設定です。
            </span>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              aria-invalid={Boolean(error)}
            >
              <TagIcon data-icon="inline-start" />
              タグを選択・追加
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                placeholder="タグを検索または入力"
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "タグ候補を読み込み中です。" : "候補タグはありません。"}
                </CommandEmpty>
                <CommandGroup>
                  {canCreateSearchTag ? (
                    <CommandItem
                      value={`create:${search}`}
                      onSelect={() => addTag(search)}
                    >
                      <PlusIcon data-icon="inline-start" />
                      {search.trim()} を追加
                    </CommandItem>
                  ) : null}
                  {filteredOptions.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => addTag(tag)}
                    >
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <FieldDescription>
        既存タグを選択するか、新しいタグを入力して追加できます。
      </FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

const parseTags = (value: string) => {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};
