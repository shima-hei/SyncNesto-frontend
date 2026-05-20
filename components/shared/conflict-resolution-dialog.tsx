"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ConflictField } from "@/lib/api/conflict";

type ConflictChoice = "local" | "current";

type ConflictResolutionDialogProps<TValues extends Record<string, unknown>> = {
  open: boolean;
  fields: ConflictField[];
  localValues: TValues;
  currentValues: TValues;
  fieldLabels: Partial<Record<keyof TValues & string, string>>;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (values: TValues) => Promise<unknown> | unknown;
};

export function ConflictResolutionDialog<TValues extends Record<string, unknown>>({
  open,
  fields,
  localValues,
  currentValues,
  fieldLabels,
  isPending = false,
  onOpenChange,
  onResolve,
}: ConflictResolutionDialogProps<TValues>) {
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  const resolvedValues = getResolvedValues({
    fields,
    localValues,
    currentValues,
    choices,
  });

  const handleChoiceChange = (fieldKey: string, choice: string) => {
    if (!isConflictChoice(choice)) {
      return;
    }

    setChoices((current) => ({
      ...current,
      [fieldKey]: choice,
    }));
  };

  const handleResolve = async () => {
    await onResolve(resolvedValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>更新内容が競合しました</DialogTitle>
          <DialogDescription>
            項目ごとに反映する内容を選択して、最新のversionで再度更新します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {fields.length ? (
            fields.map((field) => {
              const choice = choices[field.key] ?? "local";

              return (
                <div
                  key={field.key}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[160px_1fr]"
                >
                  <div className="text-sm font-medium">
                    {fieldLabels[field.key] ?? field.key}
                  </div>
                  <div className="flex flex-col gap-2">
                    <ToggleGroup
                      type="single"
                      value={choice}
                      onValueChange={(value) =>
                        handleChoiceChange(field.key, value)
                      }
                      variant="outline"
                    >
                      <ToggleGroupItem value="local">
                        自分の入力
                      </ToggleGroupItem>
                      <ToggleGroupItem value="current">
                        サーバー最新値
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <div className="grid gap-2 md:grid-cols-2">
                      <ConflictValue
                        label="自分の入力"
                        selected={choice === "local"}
                        value={field.localValue}
                      />
                      <ConflictValue
                        label="サーバー最新値"
                        selected={choice === "current"}
                        value={field.currentValue}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      更新前: {formatConflictValue(field.originalValue)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              競合した項目はありません。自分の入力内容を最新versionで再送信できます。
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button type="button" disabled={isPending} onClick={handleResolve}>
            再更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConflictValue({
  label,
  value,
  selected,
}: {
  label: string;
  value: unknown;
  selected: boolean;
}) {
  return (
    <div
      className={
        selected
          ? "rounded-lg border bg-muted p-2"
          : "rounded-lg border p-2"
      }
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm">
        {formatConflictValue(value)}
      </div>
    </div>
  );
}

const getResolvedValues = <TValues extends Record<string, unknown>>({
  fields,
  localValues,
  currentValues,
  choices,
}: {
  fields: ConflictField[];
  localValues: TValues;
  currentValues: TValues;
  choices: Record<string, ConflictChoice>;
}) => {
  return fields.reduce<TValues>(
    (resolvedValues, field) => {
      const choice = choices[field.key] ?? "local";

      if (choice === "current") {
        return {
          ...resolvedValues,
          [field.key]: currentValues[field.key],
        };
      }

      return resolvedValues;
    },
    { ...localValues }
  );
};

const isConflictChoice = (value: string): value is ConflictChoice => {
  return value === "local" || value === "current";
};

const formatConflictValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "はい" : "いいえ";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};
