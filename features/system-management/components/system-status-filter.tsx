"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SystemStatusFilter({
  value,
  onChange,
  label = "状態",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="active">有効</SelectItem>
          <SelectItem value="suspended">停止中</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
