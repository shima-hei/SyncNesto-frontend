"use client";

import { useId } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ChoiceField({
  label,
  value,
  onChange,
  choices,
  disabled,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: { value: string; label: string }[];
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {compact ? (
        <ToggleGroup
          type="single"
          variant="outline"
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next);
          }}
          disabled={disabled}
          aria-label={label}
          className="flex-wrap"
        >
          {choices.map((choice) => (
            <ToggleGroupItem key={choice.value} value={choice.value}>
              {choice.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {choices.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
