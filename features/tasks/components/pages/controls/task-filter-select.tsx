"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskFilterSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  allValue?: string;
  allLabel?: string;
  onValueChange: (value: string) => void;
};

export function TaskFilterSelect({
  label,
  value,
  placeholder,
  options,
  allValue,
  allLabel,
  onValueChange,
}: TaskFilterSelectProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allValue && allLabel ? (
              <SelectItem value={allValue}>{allLabel}</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
