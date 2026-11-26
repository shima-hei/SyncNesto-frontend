"use client";

import { useRef, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import { DraftLinkPreview } from "./draft-link-preview";
import { LinkInsertPopover } from "./link-insert-popover";

type Props = Omit<
  ComponentProps<typeof Textarea>,
  "ref" | "onChange" | "value"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function LinkTextarea({ value, onValueChange, ...props }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="min-w-0 space-y-1">
      <Textarea
        {...props}
        ref={input}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <div className="flex min-w-0 items-start gap-1">
        <LinkInsertPopover
          iconOnly
          editor={() => input.current}
          onChange={({ value }) => onValueChange(value)}
          disabled={props.disabled || props.readOnly}
        />
        <DraftLinkPreview value={value} />
      </div>
    </div>
  );
}
