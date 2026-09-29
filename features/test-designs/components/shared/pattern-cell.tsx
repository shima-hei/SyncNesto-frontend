"use client";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import type { Design } from "../../lib/design";

type Pattern = NonNullable<Design["pattern_tables"]>[number];
export function PatternCell({
  itemCode,
  table,
  tables,
  readOnly,
  onSelect,
  onOpen,
  onCreate,
}: {
  itemCode: string;
  table?: Pattern;
  tables: Pattern[];
  readOnly: boolean;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const act = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-pattern-selector
          variant="ghost"
          size="sm"
          className="group h-7 w-full min-w-0 justify-between px-0"
          aria-label={`${itemCode} パターン${table ? ` ${table.name}` : "未設定"}`}
          aria-expanded={open}
          onKeyDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{table?.name}</span>
          <ChevronDownIcon className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-expanded:opacity-100" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="パターンを検索"
            aria-label="パターンを検索"
          />
          <CommandList>
            <CommandEmpty>該当するパターンはありません。</CommandEmpty>
            <CommandGroup heading="パターンを選択">
              {tables.map((value) => (
                <CommandItem
                  key={value.id}
                  value={value.id}
                  keywords={[value.name]}
                  disabled={readOnly}
                  onSelect={() => act(() => onSelect(value.id))}
                >
                  {value.id === table?.id && <CheckIcon />}
                  <span className="truncate">{value.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="操作">
              {table && (
                <CommandItem onSelect={() => act(onOpen)}>
                  <PencilIcon />
                  現在のパターンを確認・編集
                </CommandItem>
              )}
              {table && !readOnly && (
                <CommandItem onSelect={() => act(() => onSelect(""))}>
                  パターン設定を解除
                </CommandItem>
              )}
              {!readOnly && (
                <CommandItem onSelect={() => act(onCreate)}>
                  <PlusIcon />
                  新しいパターンを作成
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
