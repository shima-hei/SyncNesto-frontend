"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PatternNameInput({
  name,
  names,
  label,
  id,
  disabled,
  onCommit,
  multiline = false,
  maxLength = 200,
}: {
  name: string;
  names: string[];
  label: string;
  id?: string;
  disabled: boolean;
  onCommit: (name: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  const Component = multiline || name.includes("\n") ? Textarea : Input;
  return (
    <Component
      key={name}
      id={id}
      aria-label={label}
      defaultValue={name}
      maxLength={maxLength}
      disabled={disabled}
      className="min-h-9 min-w-0 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input"
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (
          event.key === "Enter" &&
          ((!multiline && !event.altKey) || event.ctrlKey || event.metaKey)
        ) {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.currentTarget.value = name;
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        const value = event.currentTarget.value;
        if (value === name) return;
        if (!value.trim() || names.includes(value)) {
          toast.error("名称は空欄または重複にできません");
          event.currentTarget.value = name;
        } else onCommit(value);
      }}
    />
  );
}
