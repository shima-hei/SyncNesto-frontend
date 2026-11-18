"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

export type CellExit = "stay" | "blur" | "next" | "previous";

export function PlanningCellInput({
  initial,
  label,
  numeric,
  required,
  maxLength,
  onSave,
  onExit,
  onTab,
}: {
  initial: string;
  label: string;
  numeric?: boolean;
  required?: boolean;
  maxLength?: number;
  onSave: (value: string) => Promise<void>;
  onExit: (exit: CellExit) => void;
  onTab?: (backwards: boolean) => boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    input.current?.select();
  }, []);
  async function finish(exit: CellExit) {
    if (locked.current) return;
    const next = value.trim();
    const el = input.current;
    if (!el) return;
    if (next === initial && !el.validity.badInput) {
      locked.current = true;
      onExit(exit);
      return;
    }
    if (!el.checkValidity() || (required && !next)) {
      setInvalid(true);
      el.reportValidity();
      return;
    }
    locked.current = true;
    setPending(true);
    try {
      await onSave(next);
      onExit(exit);
    } catch (error) {
      toast.error(getApiErrorMessage(error), { description: label });
      onExit(exit === "blur" ? "blur" : "stay");
    }
  }
  return (
    <Input
      ref={input}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-busy={pending}
      data-effort-pending={pending}
      data-effort-dirty={value !== initial}
      className={
        numeric
          ? "ml-auto h-7 w-20 max-w-full min-w-0 px-1 text-end tabular-nums read-only:opacity-60"
          : "h-7 w-full min-w-0 px-1 read-only:opacity-60"
      }
      type={numeric ? "number" : "text"}
      min={numeric ? 0 : undefined}
      step={numeric ? "any" : undefined}
      required={required}
      maxLength={maxLength}
      readOnly={pending}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setInvalid(false);
      }}
      onBlur={() => void finish("blur")}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
        if (e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          if (!locked.current) {
            locked.current = true;
            onExit("stay");
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          void finish("stay");
        } else if (e.key === "Tab" && onTab?.(e.shiftKey)) {
          e.preventDefault();
          void finish(e.shiftKey ? "previous" : "next");
        }
      }}
    />
  );
}
