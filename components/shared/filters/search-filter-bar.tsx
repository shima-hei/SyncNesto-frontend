"use client";

import type { ReactNode } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFilterBarProps = {
  searchValue: string;
  searchPlaceholder: string;
  children?: ReactNode;
  onSearchValueChange: (value: string) => void;
  onSearch: () => void;
};

export function SearchFilterBar({
  searchValue,
  searchPlaceholder,
  children,
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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <form
        className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl"
        onSubmit={handleSubmit}
      >
        <Input
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button type="submit" variant="outline">
          <SearchIcon data-icon="inline-start" />
          検索
        </Button>
      </form>
      {children ? <div className="flex flex-col gap-2 sm:flex-row">{children}</div> : null}
    </div>
  );
}
