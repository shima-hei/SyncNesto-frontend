"use client";

import { useState } from "react";
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

import { useRequirements } from "@/features/requirements/hooks/use-requirements";

type TaskRequirementSelectFieldProps = {
  projectId: number;
  value: string;
  label?: string;
  placeholder?: string;
  showLabel?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export function TaskRequirementSelectField({
  projectId,
  value,
  label = "関連要件",
  placeholder,
  showLabel = true,
  error,
  onChange,
}: TaskRequirementSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] =
    useState<RequirementRead | null>(null);
  const { requirements, isLoading } = useRequirements(projectId, {
    page: 1,
    page_size: 20,
    q: search.trim() || undefined,
  });
  const selectedValue = getSelectedValue({
    value,
    requirements,
    selectedRequirement,
  });

  const handleSelect = (requirement: RequirementRead) => {
    setSelectedRequirement(requirement);
    onChange(String(requirement.id));
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedRequirement(null);
    onChange("");
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      {showLabel ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex min-w-0 gap-2">
        <div className="min-w-0 flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-expanded={open}
                aria-invalid={Boolean(error)}
                className={cn(
                  "w-full justify-between",
                  !selectedValue && "text-muted-foreground",
                )}
              >
                {selectedValue ? (
                  <span className="min-w-0 truncate">
                    {selectedValue.requirement_code} {selectedValue.title}
                  </span>
                ) : (
                  (placeholder ?? `${label}を選択`)
                )}
                <ChevronsUpDownIcon data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="要件コードまたはタイトルで検索"
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "検索中です。" : "候補要件がありません。"}
                  </CommandEmpty>
                  <CommandGroup>
                    {requirements.map((requirement) => (
                      <CommandItem
                        key={requirement.id}
                        value={`${requirement.requirement_code} ${requirement.title}`}
                        data-checked={selectedValue?.id === requirement.id}
                        onSelect={() => handleSelect(requirement)}
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
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!value}
          onClick={handleClear}
        >
          解除
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

const getFallbackSelectedRequirement = (
  value: string,
): RequirementRead | null => {
  const requirementId = Number(value);

  if (!Number.isInteger(requirementId) || requirementId <= 0) {
    return null;
  }

  return {
    id: requirementId,
    document_id: 0,
    version: 0,
    requirement_code: `REQ-${requirementId}`,
    requirement_type: "",
    title: "要件情報未取得",
    created_at: "",
    updated_at: "",
  };
};

const getSelectedValue = ({
  value,
  requirements,
  selectedRequirement,
}: {
  value: string;
  requirements: RequirementRead[];
  selectedRequirement: RequirementRead | null;
}) => {
  if (!value) {
    return null;
  }

  if (selectedRequirement?.id === Number(value)) {
    return selectedRequirement;
  }

  return (
    requirements.find((requirement) => String(requirement.id) === value) ??
    getFallbackSelectedRequirement(value)
  );
};
