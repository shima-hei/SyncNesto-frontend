"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DesignGrid } from "./design-grid";
import {
  type Design,
  nextCode,
  uid,
  removeFactors,
  removePatterns,
} from "../../lib/design";
import { addRow } from "../../lib/sheets";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import {
  matrixRows,
  editMatrix,
  duplicatePattern,
  removeMatrixRows,
} from "../../lib/matrix";

export function PatternMatrix({
  design,
  change,
  readOnly,
  onUndo,
  onRedo,
}: {
  design: Design;
  change: (mutate: (d: Design) => void) => void;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const [selected, setSelected] = useState({ row: "", col: "" });
  const { confirm, confirmDialogProps } = useConfirmAction();
  const rows = useMemo(() => matrixRows(design).slice(4), [design]);
  const factorId =
    design.levels.find((l) => l.id === selected.row)?.factor_id ??
    (selected.row.startsWith("factor:")
      ? selected.row.slice(7)
      : !selected.row
        ? design.factors[0]?.id
        : undefined);
  const selectedPattern = design.patterns.find((p) => p.id === selected.col);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        因子・水準は○（因子ごとに1つ）、期待値は●（複数選択可）で表示します。交点をクリックまたはSpaceで選択・解除できます。因子名・水準名・期待値はダブルクリックかF2で直接編集できます。
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={readOnly}
          onClick={() => change((d) => addRow(d, "factors"))}
        >
          因子を追加
        </Button>
        <Button
          variant="outline"
          disabled={readOnly || !factorId}
          onClick={() =>
            change((d) => {
              d.levels.push({
                id: uid(),
                factor_id: factorId!,
                name: nextCode(
                  "水準",
                  d.levels
                    .filter((l) => l.factor_id === factorId)
                    .map((l) => l.name),
                ),
                position: d.levels.length,
              });
            })
          }
        >
          選択因子に水準を追加
        </Button>
        <Button
          variant="outline"
          disabled={readOnly || !factorId}
          onClick={() =>
            confirm({
              title: "選択因子を削除しますか？",
              description:
                "この因子の全水準も削除します。保存前は元に戻せます。",
              confirmLabel: "削除",
              destructive: true,
              onConfirm: () =>
                change((d) => removeFactors(d, new Set([factorId!]))),
            })
          }
        >
          選択因子を削除
        </Button>
        <Button
          variant="outline"
          disabled={readOnly}
          onClick={() =>
            change((d) => {
              d.expected_values ??= [];
              d.expected_values.push({
                id: uid(),
                name: nextCode(
                  "期待値",
                  d.expected_values.map((v) => v.name),
                ),
                position: d.expected_values.length,
              });
            })
          }
        >
          期待値を追加
        </Button>
        <Button
          variant="outline"
          disabled={readOnly || !selectedPattern}
          onClick={() =>
            change((d) => {
              duplicatePattern(d, selected.col);
            })
          }
        >
          選択組み合わせを複製
        </Button>
      </div>
      <div className="min-h-10">
        {selectedPattern && (
          <div className="flex flex-wrap items-center gap-3">
            <label>
              組み合わせ名{" "}
              <input
                aria-label="組み合わせ名"
                disabled={readOnly}
                className="rounded border p-1"
                value={selectedPattern.code}
                onChange={(e) =>
                  change((d) => {
                    d.patterns.find((p) => p.id === selectedPattern.id)!.code =
                      e.target.value;
                  })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={selectedPattern.enabled !== false}
                onChange={(e) =>
                  change((d) => {
                    d.patterns.find(
                      (p) => p.id === selectedPattern.id,
                    )!.enabled = e.target.checked;
                  })
                }
              />{" "}
              有効（ケース生成対象）
            </label>
          </div>
        )}
      </div>
      <DesignGrid
        sheet="matrix"
        toggleOnClick
        toggleStartRow={0}
        columnAddLabel="組み合わせを追加"
        rows={rows}
        columns={[
          { key: "factor", label: "因子" },
          { key: "level", label: "水準 / 期待値" },
          ...design.patterns.map((p) => ({
            key: p.id,
            label: `${p.code}${p.enabled === false ? "（無効）" : ""}`,
          })),
        ]}
        layout={design.layout}
        readOnly={readOnly}
        onUndo={onUndo}
        onRedo={onRedo}
        onSelection={(row, col) => setSelected({ row, col })}
        onToggle={(row, key) => {
          if (rows[row] && design.patterns.some((p) => p.id === key))
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
              edits.map((e) => ({ ...e, row: e.row + 4 })),
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
            if (!factorId) addRow(d, "factors");
            else
              d.levels.push({
                id: uid(),
                factor_id: factorId,
                name: nextCode(
                  "水準",
                  d.levels
                    .filter((l) => l.factor_id === factorId)
                    .map((l) => l.name),
                ),
                position: d.levels.length,
              });
          })
        }
        onDelete={(ids) => {
          confirm({
            title: "選択した水準・期待値を削除しますか？",
            description: "保存前は元に戻せます。",
            confirmLabel: "削除",
            destructive: true,
            onConfirm: () => change((d) => removeMatrixRows(d, ids)),
          });
        }}
        onAddColumn={() => change((d) => addRow(d, "patterns"))}
        canDeleteColumn={(key) => design.patterns.some((p) => p.id === key)}
        onDeleteColumn={(key) => {
          confirm({
            title: "選択した組み合わせを削除しますか？",
            description: "生成済みケースは保持します。",
            confirmLabel: "削除",
            destructive: true,
            onConfirm: () => change((d) => removePatterns(d, new Set([key]))),
          });
        }}
      />
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
