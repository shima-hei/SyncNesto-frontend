"use client";

import type { ReactNode } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchFilterBarProps = {
  searchValue: string;
  searchPlaceholder: string;
  children?: ReactNode;
  variant?: "default" | "compact";
  onSearchValueChange: (value: string) => void;
  onSearch: () => void;
};

export function SearchFilterBar({
  searchValue,
  searchPlaceholder,
  children,
  variant = "default",
  onSearchValueChange,
  onSearch,
}: SearchFilterBarProps) {
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
          "flex w-full min-w-0 flex-col gap-2 sm:flex-row",
          variant === "default" && "md:max-w-xl"
        )}
        onSubmit={handleSubmit}
      >
        <Input
          className="min-w-0 flex-1"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button type="submit" variant="outline" className="shrink-0">
          <SearchIcon data-icon="inline-start" />
          検索
        </Button>
      </form>
      {children ? (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
