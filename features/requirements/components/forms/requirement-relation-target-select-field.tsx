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
import { cn } from "@/lib/utils";

import { useOpenIssues } from "../../hooks/use-open-issues";
import { useRequirementDocuments } from "../../hooks/use-requirement-documents";
import { useRequirementSections } from "../../hooks/use-requirement-sections";

type RequirementRelationTargetSelectFieldProps = {
  projectId: number;
  documentId: number;
  targetType: string;
  label: string;
  value: string;
  error?: string;
  excludedTargetIds?: string[];
  onChange: (value: string) => void;
};

type TargetOption = {
  value: string;
  title: string;
  subtitle: string;
};

export function RequirementRelationTargetSelectField({
  projectId,
  documentId,
  targetType,
  label,
  value,
  error,
  excludedTargetIds = [],
  onChange,
}: RequirementRelationTargetSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId,
  );
  const { openIssues, isLoading: isOpenIssuesLoading } = useOpenIssues(
    projectId,
    documentId,
  );
  const { documents, isFetching: isDocumentsFetching } =
    useRequirementDocuments(projectId, {
      page: 1,
      page_size: 50,
      q: targetType === "document" ? search.trim() || undefined : undefined,
    });

  const options = useMemo(() => {
    if (targetType === "section") {
      return sections.map((section) => ({
        value: String(section.id),
        title: section.title,
        subtitle: section.section_type,
      }));
    }

    if (targetType === "open_issue") {
      return openIssues.map((issue) => ({
        value: String(issue.id),
        title: issue.title,
        subtitle: issue.issue_code,
      }));
    }

    if (targetType === "document") {
      return documents.map((document) => ({
        value: String(document.id),
        title: document.title,
        subtitle: document.document_code,
      }));
    }

    return [];
  }, [documents, openIssues, sections, targetType]);

  const excludedIds = new Set(excludedTargetIds);
  const normalizedSearch = search.trim().toLowerCase();
  const selectableOptions = options.filter((option) => {
    if (excludedIds.has(option.value)) {
      return false;
    }

    if (!normalizedSearch || targetType === "document") {
      return true;
    }

    return `${option.subtitle} ${option.title}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const selectedOption =
    options.find((option) => option.value === value) ??
    getFallbackOption(value);
  const isLoading =
    targetType === "section"
      ? isSectionsLoading
      : targetType === "open_issue"
        ? isOpenIssuesLoading
        : isDocumentsFetching;

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
                !selectedOption && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {selectedOption
                  ? formatTargetOptionLabel(selectedOption)
                  : `${label}を選択`}
              </span>
              <ChevronsUpDownIcon data-icon="inline-end" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                onValueChange={setSearch}
                placeholder="コードまたは名称で検索"
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "検索中です。" : "候補がありません。"}
                </CommandEmpty>
                <CommandGroup>
                  {selectableOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={formatTargetOptionLabel(option)}
                      data-checked={option.value === value}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {option.subtitle}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {option.title}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
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
            onClick={() => onChange("")}
          >
            解除
          </Button>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function formatTargetOptionLabel(option: TargetOption) {
  return `${option.subtitle} ${option.title}`;
}

function getFallbackOption(value: string): TargetOption | null {
  if (!value) {
    return null;
  }

  return {
    value,
    title: "情報未取得",
    subtitle: `ID: ${value}`,
  };
}
