"use client";

import { useId, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchFilterBarProps = {
  searchValue: string;
  searchLabel?: string;
  searchPlaceholder: string;
  children?: ReactNode;
  variant?: "default" | "compact";
  onSearchValueChange: (value: string) => void;
  onSearch: () => void;
};

export function SearchFilterBar({
  searchValue,
  searchLabel,
  searchPlaceholder,
  children,
  variant = "default",
  onSearchValueChange,
  onSearch,
}: SearchFilterBarProps) {
  const searchInputId = useId();
  const handleSubmit = (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        variant === "default" && "md:flex-row md:items-center md:justify-between"
      )}
    >
      <form
        className={cn(
          "grid w-full min-w-0 gap-2",
          variant === "default" &&
            "sm:grid-cols-[minmax(0,1fr)_auto] md:max-w-xl",
          variant === "compact" && "sm:grid-cols-[minmax(0,1fr)_auto]"
        )}
        onSubmit={handleSubmit}
      >
        <Field>
          {searchLabel ? (
            <FieldLabel htmlFor={searchInputId}>{searchLabel}</FieldLabel>
          ) : null}
          <Input
            id={searchInputId}
            className="w-full min-w-0 flex-1"
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </Field>
        <Button
          type="submit"
          variant="outline"
          className={cn(
            "shrink-0",
            searchLabel && "sm:self-end",
            variant === "compact" && "w-full sm:w-auto"
          )}
        >
          <SearchIcon data-icon="inline-start" />
          検索
        </Button>
      </form>
      {children ? (
        <div
          className={cn(
            "grid min-w-0 gap-2 [&>*]:min-w-0",
            variant === "default" && "sm:grid-cols-2 lg:grid-cols-3",
            variant === "compact" &&
              "[grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
