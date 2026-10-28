"use client";

import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TaskSelectField({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  error,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
        {suffix ? (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
