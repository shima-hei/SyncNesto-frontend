"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ClickableTableRowProps = React.ComponentProps<typeof TableRow> & {
  href: string;
};

export function ClickableTableRow({
  href,
  children,
  className,
  onClick,
  onKeyDown,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter();

  const navigate = () => {
    router.push(href);
  };

  return (
    <TableRow
      tabIndex={0}
      className={cn(
        "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !isNestedControl(event.target)) {
          navigate();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          !isNestedControl(event.target) &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          navigate();
        }
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}

function isNestedControl(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a, button, input, select, textarea, [role=button], [role=checkbox], [role=link]",
      ),
    )
  );
}
