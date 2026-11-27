"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reviewElementId } from "../../lib/specification";

export type Row = { id?: string; name?: string };
export type Column<T> = {
  key: keyof T & string;
  label: string;
  choices?: readonly (readonly [string, string])[];
  type?: "text" | "number" | "boolean";
};

export function DesignGrid<T extends Row>({
  rows,
  onChange,
  create,
  columns,
  path,
  label,
  readOnly,
  onReview,
  details,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  create: () => T;
  columns: Column<T>[];
  path: string;
  label: string;
  readOnly: boolean;
  onReview?: (path: string) => void;
  details?: (row: T, update: (value: T) => void) => ReactNode;
}) {
  const [selected, setSelected] = useState<string>();
  const [hidden, setHidden] = useState<string[]>([]);
  const shown = columns.filter((column) => !hidden.includes(column.key));
  const active = rows.find((item) => item.id === selected);
  const index = active ? rows.indexOf(active) : -1;
  const apply = (row: T, column: Column<T>, value: string): T => ({
    ...row,
    [column.key]:
      column.type === "boolean"
        ? /^(true|1|yes|はい|必須)$/i.test(value)
        : column.type === "number"
          ? value === ""
            ? null
            : Number(value)
          : value,
  });
  const update = (at: number, row: T) =>
    onChange(rows.map((entry, index) => (index === at ? row : entry)));
  const reorder = (delta: number) => {
    if (index < 0 || index + delta < 0 || index + delta >= rows.length) return;
    const next = [...rows];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  return (
    <section className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 overflow-auto rounded-md border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/35 p-2">
          <h3 className="px-1 text-sm font-medium">{label}</h3>
          <details className="relative z-10 text-xs">
            <summary className="cursor-pointer">列の表示</summary>
            <div className="absolute right-0 z-10 w-max space-y-1 rounded-md border bg-popover p-2">
              {columns.map((column) => (
                <label className="flex items-center gap-2" key={column.key}>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={!hidden.includes(column.key)}
                    onChange={(event) =>
                      setHidden((previous) =>
                        event.target.checked
                          ? previous.filter((name) => name !== column.key)
                          : [...previous, column.key],
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </details>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const item = create();
                onChange([...rows, item]);
                setSelected(item.id);
              }}
            >
              <PlusIcon />
              {label}を追加
            </Button>
          )}
        </div>
        <table className="w-full min-w-[27rem] table-fixed text-left text-sm">
          <thead className="border-b bg-muted/15 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-2">
                <span className="sr-only">対象行</span>
              </th>
              {shown.map((column) => (
                <th key={column.key} scope="col" className="p-2 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, at) => (
              <tr
                key={row.id ?? at}
                className={cn(row.id === selected && "bg-primary/5")}
              >
                <td className="p-1">
                  <Button
                    variant={row.id === selected ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label={`${row.name || at + 1}の詳細`}
                    aria-pressed={row.id === selected}
                    onClick={() => setSelected(row.id)}
                  >
                    {at + 1}
                  </Button>
                </td>
                {shown.map((column, offset) => {
                  const value = row[column.key];
                  const cellPath = `${path}/${row.id}/${column.key}`;
                  const cellLabel = `${at + 1}行目 ${column.label}`;
                  return (
                    <td
                      key={column.key}
                      id={reviewElementId(cellPath)}
                      tabIndex={-1}
                      className="border-l p-1 text-sm focus:outline-ring"
                      onPaste={(event) => {
                        if (readOnly) return;
                        const text = event.clipboardData.getData("text/plain");
                        if (!/[\t\n]/.test(text)) return;
                        event.preventDefault();
                        const previous = [...rows];
                        const pasted = text
                          .replace(/\r/g, "")
                          .replace(/\n$/, "")
                          .split("\n")
                          .slice(0, 100);
                        pasted.forEach((line, index) => {
                          const destination = at + index;
                          const item = previous[destination] ?? create();
                          previous[destination] = line
                            .split("\t")
                            .reduce((current, entry, colIndex) => {
                              const target = shown[offset + colIndex];
                              if (
                                !target ||
                                (target.choices &&
                                  !target.choices.some(
                                    ([key]) => key === entry,
                                  ) &&
                                  entry !== "")
                              )
                                return current;
                              return apply(current, target, entry);
                            }, item);
                        });
                        onChange(previous);
                      }}
                    >
                      {readOnly ? (
                        <span className="block min-w-0 break-words p-1">
                          {column.type === "boolean"
                            ? value
                              ? "はい"
                              : "いいえ"
                            : (column.choices?.find(
                                ([key]) => key === value,
                              )?.[1] ?? String(value ?? ""))}
                        </span>
                      ) : column.type === "boolean" ? (
                        <input
                          className="ml-2 accent-primary"
                          type="checkbox"
                          aria-label={cellLabel}
                          checked={Boolean(value)}
                          onChange={(event) =>
                            update(
                              at,
                              apply(row, column, String(event.target.checked)),
                            )
                          }
                        />
                      ) : column.choices ? (
                        <select
                          className="h-8 w-full min-w-0 rounded bg-transparent px-1"
                          aria-label={cellLabel}
                          value={String(value ?? "")}
                          onChange={(event) =>
                            update(at, apply(row, column, event.target.value))
                          }
                        >
                          <option value="">未設定</option>
                          {column.choices.map(([key, title]) => (
                            <option value={key} key={key}>
                              {title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          className="h-8 border-transparent bg-transparent shadow-none focus-visible:border-input"
                          type={column.type === "number" ? "number" : "text"}
                          aria-label={cellLabel}
                          value={String(value ?? "")}
                          onChange={(event) =>
                            update(at, apply(row, column, event.target.value))
                          }
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-3 text-sm text-muted-foreground">
            登録済みの項目はありません。
          </p>
        )}
      </div>
      {active && (
        <aside className="w-full space-y-3 rounded-md border p-3 xl:w-64">
          <div className="flex items-center justify-between gap-1">
            <h4 className="truncate text-sm font-semibold">
              {active.name || `${index + 1}行目`}
            </h4>
            {!readOnly && (
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="上へ移動"
                  disabled={!index}
                  onClick={() => reorder(-1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="下へ移動"
                  disabled={index === rows.length - 1}
                  onClick={() => reorder(1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="項目を削除"
                  onClick={() => {
                    onChange(rows.filter((_, at) => at !== index));
                    setSelected(undefined);
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )}
          </div>
          {details?.(active, (value) => update(index, value))}
          {onReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(`${path}/${active.id}/name`)}
            >
              項目に指摘を追加
            </Button>
          )}
        </aside>
      )}
    </section>
  );
}
