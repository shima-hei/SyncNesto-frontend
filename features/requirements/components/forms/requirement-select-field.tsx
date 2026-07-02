"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RequirementRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import { useRequirements } from "../../hooks/use-requirements";

type RequirementSelectFieldProps = {
  projectId: number;
  documentId: number;
  label: string;
  value: string;
  error?: string;
  excludedRequirementIds?: number[];
  onChange: (value: string) => void;
};

export function RequirementSelectField({
  projectId,
  documentId,
  label,
  value,
  error,
  excludedRequirementIds = [],
  onChange,
}: RequirementSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] =
    useState<RequirementRead | null>(null);
  const { requirements, isFetching } = useRequirements(projectId, {
    page: 1,
    page_size: 20,
    document_id: documentId,
    q: search.trim() || undefined,
  });
  const excludedIds = new Set(excludedRequirementIds);
  const selectableRequirements = requirements.filter(
    (requirement) => !excludedIds.has(requirement.id),
  );
  const valueAsNumber = value ? Number(value) : null;
  const currentRequirement = useMemo(
    () =>
      valueAsNumber
        ? (requirements.find(
            (requirement) => requirement.id === valueAsNumber,
          ) ?? selectedRequirement)
        : null,
    [requirements, selectedRequirement, valueAsNumber],
  );
  const selectedLabel = currentRequirement
    ? formatRequirementLabel(currentRequirement)
    : value
      ? `要件ID: ${value}`
      : "";

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-expanded={open}
              aria-invalid={Boolean(error)}
              className={cn(
                "min-w-0 flex-1 justify-between",
                !selectedLabel && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {selectedLabel || `${label}を選択`}
              </span>
              <ChevronsUpDownIcon data-icon="inline-end" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                onValueChange={setSearch}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                placeholder="要件IDまたはタイトルで検索"
              />
              <CommandList>
                <CommandEmpty>
                  {isFetching ? "検索中です。" : "候補要件がありません。"}
                </CommandEmpty>
                <CommandGroup>
                  {selectableRequirements.map((requirement) => {
                    const isSelected = valueAsNumber === requirement.id;

                    return (
                      <CommandItem
                        key={requirement.id}
                        value={formatRequirementLabel(requirement)}
                        data-checked={isSelected}
                        onSelect={() => {
                          setSelectedRequirement(requirement);
                          onChange(String(requirement.id));
                          setOpen(false);
                        }}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {requirement.requirement_code}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {requirement.title}
                          </span>
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setSelectedRequirement(null);
              onChange("");
            }}
          >
            解除
          </Button>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function formatRequirementLabel(requirement: RequirementRead) {
  return `${requirement.requirement_code} ${requirement.title}`;
}
