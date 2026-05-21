"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";

type ClickableTableRowProps = React.ComponentProps<typeof TableRow> & {
  href: string;
};

export function ClickableTableRow({
  href,
  children,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter();

  const navigate = () => {
    router.push(href);
  };

  return (
    <TableRow
      tabIndex={0}
      className="cursor-pointer"
      onClick={navigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
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
