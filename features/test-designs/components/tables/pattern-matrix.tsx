"use client";

import { useMemo, useState } from "react";
import { CopyIcon, MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PatternNameInput } from "../shared/pattern-name-input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DesignGrid } from "./design-grid";
import {
  type Design,
  generatePatterns,
  removePatterns,
} from "../../lib/design";
import { addRow } from "../../lib/sheets";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import {
  matrixRows,
  editMatrix,
  duplicatePattern,
  removeMatrixRows,
  addFactorLevel,
} from "../../lib/matrix";
import {
  commentTargetKey,
  createMatrixCommentTarget,
  type DesignCommentTarget,
} from "../../lib/pattern-comments";

export function PatternMatrix({
  design,
  change,
  readOnly,
  onUndo,
  onRedo,
  counts,
  focus,
  onCommentTarget,
  onOpenComments,
}: {
  design: Design;
  change: (mutate: (d: Design) => void) => void;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  counts: Map<string, number>;
  focus?: { rowId: string; columnKey: string } | null;
  onCommentTarget?: (target: DesignCommentTarget, label: string) => void;
  onOpenComments?: () => void;
}) {
  const [selected, setSelected] = useState({
    row: focus?.rowId ?? "",
    col: focus?.columnKey ?? "",
  });
  const { confirm, confirmDialogProps } = useConfirmAction();
  const rows = useMemo(() => matrixRows(design).slice(4), [design]);
  const factorId =
    design.levels.find((level) => level.id === selected.row)?.factor_id ??
    (selected.row.startsWith("factor:")
      ? selected.row.slice(7)
      : !selected.row
        ? design.factors[0]?.id
        : undefined);
  const selectedPattern = design.patterns.find(
    (pattern) => pattern.id === selected.col,
  );
  const cellTarget = useMemo(() => createMatrixCommentTarget(design), [design]);
  const markerRows = useMemo(() => {
    const first = new Map<string, string>();
    for (const level of design.levels)
      if (!first.has(level.factor_id)) first.set(level.factor_id, level.id);
    const selected = new Map(
      design.values
        .filter((value) => value.level_id)
        .map((value) => [
          `${value.pattern_id}:${value.factor_id}`,
          value.level_id!,
        ]),
    );
    return { first, selected };
  }, [design]);
  const target = cellTarget(selected.row, selected.col);
  const selectTarget = (rowId: string, columnKey: string) => {
    const cell = cellTarget(rowId, columnKey);
    if (cell) onCommentTarget?.(cell.target, cell.label);
  };
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <DesignGrid
        sheet="matrix"
        toggleOnClick
        toggleStartRow={0}
        columnAddLabel="組み合わせを追加"
        structureRowAddLabel={factorId ? "選択因子に水準を追加" : "因子を追加"}
        focusRowId={focus?.rowId}
        focusColumnKey={focus?.columnKey}
        toolbarStart={
          <div className="mr-auto flex flex-wrap items-center gap-3">
            <h3 className="text-base font-semibold">
              組み合わせ{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {design.patterns.length}列
              </span>
            </h3>
            <span className="text-xs text-muted-foreground">
              ○ 水準 / ● 期待値
            </span>
            {onOpenComments && (
              <Button
                size="sm"
                variant="ghost"
                disabled={!target}
                title={target?.label}
                onClick={() => {
                  selectTarget(selected.row, selected.col);
                  onOpenComments();
                }}
              >
                <MessageSquareIcon data-icon="inline-start" />
                選択セルのコメント
              </Button>
            )}
          </div>
        }
        structureMenuItems={
          <>
            <DropdownMenuItem
              disabled={readOnly}
              onSelect={() =>
                confirm({
                  title: "全組み合わせを追加しますか？",
                  description:
                    "この表の因子から未登録の組み合わせを追加します。上限は10,000列・100,000個の因子値です。",
                  confirmLabel: "追加",
                  onConfirm: () => change(generatePatterns),
                })
              }
            >
              全組み合わせを追加
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={readOnly || !selectedPattern}
              onSelect={() =>
                change((d) => {
                  duplicatePattern(d, selected.col);
                })
              }
            >
              <CopyIcon />
              選択組み合わせを複製
            </DropdownMenuItem>
          </>
        }
        rows={rows}
        columns={[
          { key: "factor", label: "因子" },
          { key: "level", label: "水準 / 期待値" },
          ...design.patterns.map((pattern) => ({
            key: pattern.id,
            label: `${pattern.code}${pattern.enabled === false ? "（無効）" : ""}`,
          })),
        ]}
        layout={design.layout}
        readOnly={readOnly}
        onUndo={onUndo}
        onRedo={onRedo}
        onSelection={(row, col) => {
          selectTarget(row, col);
          setSelected({ row, col });
        }}
        cellCommentCount={(row, col) => {
          const cell = cellTarget(row.id, col.key);
          if (cell?.target.target_type === "factor" && !row.values.factor)
            return 0;
          if (
            cell?.target.target_type === "expected_value" &&
            col.key === "factor"
          )
            return 0;
          if (
            cell?.target.target_type === "combination" &&
            cell.target.field?.startsWith("level:")
          ) {
            const factorId = cell.target.field.slice(6);
            const markerRow =
              markerRows.selected.get(`${cell.target.target_id}:${factorId}`) ??
              markerRows.first.get(factorId) ??
              `factor:${factorId}`;
            if (markerRow !== row.id) return 0;
          }
          return cell ? (counts.get(commentTargetKey(cell.target)) ?? 0) : 0;
        }}
        onCellComment={(row, col) => {
          selectTarget(row.id, col.key);
          onOpenComments?.();
        }}
        onToggle={(row, key) => {
          if (
            rows[row] &&
            design.patterns.some((pattern) => pattern.id === key)
          )
            change((d) =>
              editMatrix(d, [
                { row: row + 4, key, value: rows[row].values[key] ? "" : "○" },
              ]),
            );
        }}
        onEdit={(edits) =>
          change((d) =>
            editMatrix(
              d,
              edits.map((edit) => ({ ...edit, row: edit.row + 4 })),
            ),
          )
        }
        onLayout={(layout) =>
          change((d) => {
            d.layout = layout;
          })
        }
        onAdd={() =>
          change((d) => {
            if (factorId) addFactorLevel(d, factorId);
            else addRow(d, "factors");
          })
        }
        onDelete={(ids) =>
          confirm({
            title: "選択した水準・期待値を削除しますか？",
            description: "保存前は元に戻せます。",
            confirmLabel: "削除",
            destructive: true,
            onConfirm: () => change((d) => removeMatrixRows(d, ids)),
          })
        }
        onAddColumn={() => change((d) => addRow(d, "patterns"))}
        canDeleteColumn={(key) =>
          design.patterns.some((pattern) => pattern.id === key)
        }
        onDeleteColumn={(key) =>
          confirm({
            title: "選択した組み合わせを削除しますか？",
            description: "生成済みケースは保持します。",
            confirmLabel: "削除",
            destructive: true,
            onConfirm: () => change((d) => removePatterns(d, new Set([key]))),
          })
        }
      />
      {selectedPattern && (
        <details className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">
            {selectedPattern.code} · 組み合わせ名・有効状態・説明・備考
          </summary>
          <FieldGroup className="mt-3 gap-3 sm:grid sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="combination-code">組み合わせ名</FieldLabel>
              <PatternNameInput
                id="combination-code"
                label="組み合わせ名"
                maxLength={100}
                disabled={readOnly}
                name={selectedPattern.code}
                names={design.patterns
                  .filter((pattern) => pattern.id !== selectedPattern.id)
                  .map((pattern) => pattern.code)}
                onCommit={(value) =>
                  change((d) =>
                    editMatrix(d, [{ row: 0, key: selectedPattern.id, value }]),
                  )
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="combination-enabled">ケース生成</FieldLabel>
              <label className="flex h-9 items-center gap-2">
                <Checkbox
                  id="combination-enabled"
                  disabled={readOnly}
                  checked={selectedPattern.enabled !== false}
                  onCheckedChange={(checked) =>
                    change((d) => {
                      d.patterns.find(
                        (pattern) => pattern.id === selectedPattern.id,
                      )!.enabled = checked === true;
                    })
                  }
                />
                有効（ケース生成対象）
              </label>
            </Field>
            {(["description", "notes"] as const).map((field) => (
              <Field key={field}>
                <FieldLabel htmlFor={`combination-${field}`}>
                  {field === "description" ? "説明" : "備考"}
                </FieldLabel>
                <Textarea
                  id={`combination-${field}`}
                  disabled={readOnly}
                  value={selectedPattern[field] ?? ""}
                  onChange={(event) =>
                    change((d) => {
                      d.patterns.find(
                        (pattern) => pattern.id === selectedPattern.id,
                      )![field] = event.target.value;
                    })
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  onClick={() => {
                    onCommentTarget?.(
                      {
                        target_type: "combination",
                        target_id: selectedPattern.id,
                        field,
                      },
                      `${selectedPattern.code} · ${field === "description" ? "説明" : "備考"}`,
                    );
                    onOpenComments?.();
                  }}
                >
                  この{field === "description" ? "説明" : "備考"}にコメント
                </Button>
              </Field>
            ))}
          </FieldGroup>
        </details>
      )}
      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          「因子・水準」タブで因子と水準を定義すると、ここで組み合わせを選択できます。
        </p>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
