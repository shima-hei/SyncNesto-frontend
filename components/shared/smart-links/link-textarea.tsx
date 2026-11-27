"use client";

import { useRef, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { BodyImageScope } from "@/lib/markdown-body-images";
import { useMarkdownImageInsert } from "@/components/shared/forms/markdown-image-insert";
import { DraftLinkPreview } from "./draft-link-preview";
import { LinkInsertPopover } from "./link-insert-popover";

type Props = Omit<
  ComponentProps<typeof Textarea>,
  "ref" | "onChange" | "value"
> & {
  value: string;
  onValueChange: (value: string) => void;
  images?: BodyImageScope;
};

export function LinkTextarea({
  value,
  onValueChange,
  images,
  ...props
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const imageInsert = useMarkdownImageInsert({
    value,
    onChange: onValueChange,
    scope: images,
    textarea: input,
    disabled: props.disabled || props.readOnly,
  });
  return (
    <div className="min-w-0 space-y-1">
      <Textarea
        {...props}
        {...imageInsert.editorProps}
        ref={input}
        value={value}
        onChange={(event) => imageInsert.change(event.target.value)}
      />
      <div className="flex min-w-0 items-start gap-1">
        <LinkInsertPopover
          iconOnly
          editor={() => input.current}
          onChange={({ value }) => imageInsert.change(value)}
          disabled={props.disabled || props.readOnly}
        />
        {!props.disabled && !props.readOnly ? imageInsert.control : null}
        <DraftLinkPreview value={value} />
      </div>
      {imageInsert.status}
    </div>
  );
}
