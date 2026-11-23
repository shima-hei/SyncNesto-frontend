"use client";

import { Columns3Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_LIST_COLUMNS,
  type TaskListColumn,
} from "../../../lib/task-list-columns";

export function TaskListColumnsMenu({
  columns,
  onChange,
}: {
  columns: TaskListColumn[];
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Columns3Icon aria-hidden />
          列の表示
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TASK_LIST_COLUMNS.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={columns.includes(key)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...columns, key]
                : columns.filter((column) => column !== key);
              onChange(next.join(",") || "none");
            }}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange("")}>
          初期表示に戻す
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
