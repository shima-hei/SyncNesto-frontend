"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { type Design, generatePatterns } from "../../lib/design";
import {
  createPatternTable,
  deletePatternTable,
  tableDesign,
  editPatternTable,
} from "../../lib/pattern-tables";
import { PatternMatrix } from "../tables/pattern-matrix";
import { useConfirmAction } from "../../hooks/use-confirm-action";

export function PatternTablesManager({
  design,
  change,
  readOnly,
  onUndo,
  onRedo,
  activeId,
  onOpen,
  onClose,
  onItem,
}: {
  design: Design;
  change: (f: (d: Design) => void) => void;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  onItem: (id: string) => void;
}) {
  const { confirm, confirmDialogProps } = useConfirmAction();
  const table = design.pattern_tables?.find((t) => t.id === activeId);
  if (table) {
    const used = design.items.filter((i) => i.pattern_table_id === table.id);
    return (
      <>
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              パターン管理一覧へ
            </Button>
            <label className="flex items-center gap-2">
              パターン表名
              <Input
                aria-label="パターン表名"
                disabled={readOnly}
                value={table.name}
                onChange={(e) =>
                  change((d) => {
                    d.pattern_tables!.find((t) => t.id === table.id)!.name =
                      e.target.value;
                  })
                }
              />
            </label>
            <Button
              variant="outline"
              disabled={readOnly}
              onClick={() =>
                confirm({
                  title: `「${table.name}」を削除しますか？`,
                  description: `使用中の${used.length}件の項目はパターン表なしになります。既存のケース結果は保持します。`,
                  confirmLabel: "削除",
                  destructive: true,
                  onConfirm: () => {
                    change((d) => deletePatternTable(d, table.id));
                    onClose();
                  },
                })
              }
            >
              パターン表を削除
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>使用テスト項目：{used.length}件</span>
            {used.map((i) => (
              <Button key={i.id} variant="link" onClick={() => onItem(i.id)}>
                {i.code}
              </Button>
            ))}
          </div>
          <Button
            className="self-start"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              confirm({
                title: "全組み合わせを追加しますか？",
                description:
                  "この表の因子を使い、未登録の組み合わせを追加します。",
                confirmLabel: "追加",
                onConfirm: () =>
                  change((d) =>
                    editPatternTable(d, table.id, generatePatterns),
                  ),
              })
            }
          >
            この表の全組み合わせを追加
          </Button>
          <PatternMatrix
            key={table.id}
            design={tableDesign(design, table.id)}
            change={(f) => change((d) => editPatternTable(d, table.id, f))}
            readOnly={readOnly}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        </section>
        <ConfirmDialog {...confirmDialogProps} />
      </>
    );
  }
  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">用途ごとのパターン表</h2>
          <Button
            disabled={readOnly}
            onClick={() => change((d) => onOpen(createPatternTable(d)))}
          >
            ＋ 新しいパターン表を作成
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>パターン表</TableHead>
              <TableHead>因子数</TableHead>
              <TableHead>組み合わせ数（有効）</TableHead>
              <TableHead>使用テスト項目</TableHead>
              <TableHead>使用項目数</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(design.pattern_tables ?? []).map((t) => {
              const used = design.items.filter(
                (i) => i.pattern_table_id === t.id,
              );
              return (
                <TableRow
                  key={t.id}
                  tabIndex={0}
                  className="cursor-pointer hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`${t.name}を開く`}
                  onClick={() => onOpen(t.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(t.id);
                    }
                  }}
                >
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    {design.factors.filter((f) => f.table_id === t.id).length}
                  </TableCell>
                  <TableCell>
                    {
                      design.patterns.filter(
                        (p) => p.table_id === t.id && p.enabled !== false,
                      ).length
                    }
                  </TableCell>
                  <TableCell>
                    {used.map((i) => (
                      <Button
                        key={i.id}
                        variant="link"
                        onClick={(event) => {
                          event.stopPropagation();
                          onItem(i.id);
                        }}
                      >
                        {i.code}
                      </Button>
                    ))}
                  </TableCell>
                  <TableCell>{used.length}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      disabled={readOnly}
                      aria-label={`${t.name}を削除`}
                      onClick={(event) => {
                        event.stopPropagation();
                        confirm({
                          title: `「${t.name}」を削除しますか？`,
                          description: `使用中の${used.length}件の項目はパターン表なしになります。既存のケース結果は保持します。`,
                          confirmLabel: "削除",
                          destructive: true,
                          onConfirm: () =>
                            change((d) => deletePatternTable(d, t.id)),
                        });
                      }}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!design.pattern_tables?.length && (
          <p className="text-sm text-muted-foreground">
            必要な用途ごとにパターン表を作成できます。表を使用しない項目も1ケースとして生成されます。
          </p>
        )}
      </section>
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
