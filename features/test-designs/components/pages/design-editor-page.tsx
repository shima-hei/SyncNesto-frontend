"use client";

import { Activity, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import { DesignInspector } from "../shared/design-inspector";
import { PatternCell } from "../shared/pattern-cell";
import { readTestDesignProjectsProjectIdTestDesignsDesignIdGet as readDesign } from "@/lib/api/generated/test-designs/test-designs";
import { useDesignEditor } from "../../hooks/use-design-editor";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { useDesignPermissions } from "../../hooks/use-design-permissions";
import { insertItem, uid, type Design } from "../../lib/design";
import {
  addRow,
  deleteRows,
  editCells,
  gridData,
  sheetLabels,
  sheets,
} from "../../lib/sheets";
import { DesignGrid } from "../tables/design-grid";
import { CasesSection } from "../sections/cases-section";
import {
  PatternTablesManager,
  type PatternTab,
} from "../sections/pattern-tables-manager";
import { useDesignComments } from "../../hooks/use-design-comments";
import {
  commentCounts,
  commentTargetKey,
  patternCommentIndex,
  matrixCommentFocus,
} from "../../lib/pattern-comments";
import {
  DesignCommentsPanel,
  type DesignCommentTarget,
} from "../sections/design-comments-panel";
import { RequirementLinksPanel } from "../sections/requirement-links-panel";
import { caseCounts, createPatternTable } from "../../lib/pattern-tables";

export function DesignEditorPage({
  projectId,
  designId,
}: {
  projectId: number;
  designId: number;
}) {
  const query = useQuery({
    queryKey: ["test-design", projectId, designId],
    queryFn: () => readDesign(projectId, designId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending) return <p>テスト設計を読み込み中…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  return <Editor key={query.data.id} initial={query.data} />;
}

function Editor({ initial }: { initial: Design }) {
  const params = useSearchParams();
  const state = useDesignEditor(initial);
  const { confirm, confirmDialogProps } = useConfirmAction();
  const { design, change } = state;
  const permissions = useDesignPermissions(design.project_id);
  const [sheet, setSheet] = useUrlTabState({
    values: sheets,
    defaultValue: "items",
  });
  const grid = useMemo(() => gridData(design, "items"), [design]);
  const readOnly = !permissions.edit || state.saving;
  const [selectedItem, setSelectedItem] = useState(
    params.get("item") ?? initial.items[0]?.id ?? "",
  );
  const [focusColumnKey, setFocusColumnKey] = useState<string | undefined>();
  const [focusRequest, setFocusRequest] = useState(0);
  const [activeItemId, setActiveItemId] = useState(selectedItem);
  const [commentTarget, setCommentTarget] =
    useState<DesignCommentTarget | null>(null);
  const [commentTargetLabel, setCommentTargetLabel] =
    useState("テスト設計書全体");
  const activeItem = design.items.find(
    (item) => item.id === activeItemId && !item.is_spacer,
  );
  const [activeTable, setActiveTable] = useState<string | null>(
    params.get("table"),
  );
  const [inspector, setInspector] = useState<
    "patterns" | "comments" | "requirements" | null
  >(
    params.get("tab") === "patterns" || params.get("table") ? "patterns" : null,
  );
  const [patternTab, setPatternTab] = useState<PatternTab>("combinations");

  const [commentFocus, setCommentFocus] = useState<{
    target: DesignCommentTarget;
    request: number;
  } | null>(null);
  const commentsQuery = useDesignComments(design.project_id, design.id);
  const counts = useMemo(
    () => commentCounts(commentsQuery.data ?? []),
    [commentsQuery.data],
  );
  const commentIndex = useMemo(() => patternCommentIndex(design), [design]);
  const scopeTargets = useMemo(
    () =>
      new Set(
        [...commentIndex.tables]
          .filter(([, tableId]) => tableId === activeTable)
          .map(([key]) => key),
      ),
    [commentIndex, activeTable],
  );

  const expandedCount = [...caseCounts(design).values()].reduce(
    (n, count) => n + count,
    0,
  );
  const openTable = (id: string, tab: PatternTab = "combinations") => {
    setActiveTable(id);
    setPatternTab(tab);
    setInspector("patterns");
    setCommentFocus(null);
    const table = design.pattern_tables?.find((value) => value.id === id);
    setCommentTarget({
      target_type: "pattern_table",
      target_id: id,
      field: "name",
    });
    setCommentTargetLabel(`パターン表 · ${table?.name ?? "新規パターン"}`);
  };
  const commentsPanel = (
    <div className="min-w-0 scroll-mt-4">
      <DesignCommentsPanel
        projectId={design.project_id}
        designId={design.id}
        target={commentTarget}
        targetLabel={commentTargetLabel}
        disabled={state.dirty || state.saving}
        canComment={permissions.edit}
        customFieldLabels={Object.fromEntries(
          design.columns.map((column) => [column.key, column.label]),
        )}
        itemCodes={Object.fromEntries(
          design.items.map((item) => [item.id, item.code]),
        )}
        compact
        scopeTargets={
          commentTarget &&
          commentTarget.target_type !== "test_item" &&
          commentTarget?.target_type !== "design"
            ? scopeTargets
            : undefined
        }
        resolveTargetLabel={(target) => {
          const label = commentIndex.labels.get(commentTargetKey(target));
          if (label) return label;
          if (target.target_type === "combination") {
            const pattern = design.patterns.find(
              (pattern) => pattern.id === target.target_id,
            );
            const name = target.field?.startsWith("level:")
              ? commentIndex.factors.get(target.field.slice(6))?.name
              : target.field?.startsWith("expected:")
                ? commentIndex.expected.get(target.field.slice(9))?.name
                : undefined;
            if (pattern && name) return `${pattern.code} · ${name}`;
          }
        }}
        onSelectTarget={(target, label) => {
          if (target.target_type === "test_item" && target.target_id) {
            if (design.items.some((item) => item.id === target.target_id)) {
              setActiveItemId(target.target_id);
              const columnKey = target.field ?? "code";
              if (
                gridData(design, "items").columns.some(
                  (column) => column.key === columnKey,
                )
              ) {
                setSelectedItem(target.target_id);
                setFocusColumnKey(columnKey);
                setFocusRequest((value) => value + 1);
              }
            } else {
              setActiveItemId("");
            }
            setInspector("comments");
            setSheet("items");
          } else if (target.target_type !== "design") {
            setFocusColumnKey(undefined);
            const tableId = commentIndex.tables.get(
              `${target.target_type}:${target.target_id ?? ""}`,
            );
            if (tableId) {
              setActiveTable(tableId);
              setPatternTab("combinations");
              setInspector("patterns");
              if (matrixCommentFocus(design, target))
                setCommentFocus((previous) => ({
                  target,
                  request: (previous?.request ?? 0) + 1,
                }));
              setSheet("items");
            }
          }
          setCommentTarget(target);
          setCommentTargetLabel(label);
        }}
      />
    </div>
  );
  const manager = (
    <PatternTablesManager
      design={design}
      change={change}
      readOnly={readOnly}
      onUndo={state.undo}
      onRedo={state.redo}
      activeId={activeTable}
      onOpen={openTable}
      onClose={() => {
        setActiveTable(null);
        setCommentFocus(null);
      }}
      onItem={(id) => {
        setSelectedItem(id);
        setFocusColumnKey(undefined);
        setActiveItemId(id);
        setInspector(null);
        setSheet("items");
      }}
      onCommentTarget={(target, label) => {
        setCommentTarget(target);
        setCommentTargetLabel(label);
      }}
      onOpenComments={() => {
        setInspector("comments");
      }}
      comments={commentsQuery.data ?? []}
      tab={patternTab}
      onTabChange={setPatternTab}
      commentFocus={commentFocus}
    />
  );
  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!readOnly) void state.save();
        }
      }}
    >
      <Link
        href={`/projects/joined/${design.project_id}/test-designs`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← テスト設計書一覧
      </Link>
      <PageHeader
        title={design.name}
        description={`テスト項目 ${design.items.filter((item) => !item.is_spacer).length}件 · パターン展開後 ${expandedCount}テストケース`}
        actions={
          <Button
            disabled={readOnly || !state.dirty}
            onClick={() => void state.save()}
          >
            保存
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3 border-y py-2">
        <span
          className={`text-sm ${state.dirty ? "text-[var(--status-warning-fg)]" : "text-muted-foreground"}`}
          role="status"
        >
          {state.saving
            ? "保存中…"
            : state.dirty
              ? "未保存の変更あり"
              : `保存済み v${design.version}`}
        </span>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            size="sm"
            variant="outline"
            disabled={readOnly || !state.canUndo}
            onClick={state.undo}
          >
            元に戻す
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={readOnly || !state.canRedo}
            onClick={state.redo}
          >
            やり直す
          </Button>
          <Button size="sm" variant="outline" onClick={state.exportDraft}>
            編集内容を退避
          </Button>
        </div>
      </div>
      {state.recovery && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border p-3"
        >
          <p className="text-sm">このブラウザに未保存の編集内容があります。</p>
          <Button
            variant="outline"
            disabled={readOnly}
            onClick={state.restoreDraft}
          >
            下書きを復元
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              confirm({
                title: "下書きを破棄しますか？",
                description: "ブラウザに残った未保存の下書きを削除します。",
                confirmLabel: "破棄",
                destructive: true,
                onConfirm: state.discardDraft,
              })
            }
          >
            下書きを破棄
          </Button>
        </div>
      )}
      {state.draftError && (
        <p role="alert" className="text-sm">
          ブラウザへの下書き保存ができません。保存または「編集内容を退避」を使用してください。
        </p>
      )}
      <details className="group border-b">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span>設計書情報</span>
          <span className="text-xs font-normal text-muted-foreground">
            名前・説明を編集
          </span>
          <ChevronDownIcon
            className="ml-auto size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <FieldGroup className="grid gap-3 pb-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="design-name">設計書名</FieldLabel>
            <Input
              id="design-name"
              value={design.name}
              maxLength={200}
              disabled={readOnly}
              onChange={(e) =>
                change((d) => {
                  d.name = e.target.value;
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="design-description">説明</FieldLabel>
            <Input
              id="design-description"
              value={design.description ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                change((d) => {
                  d.description = e.target.value;
                })
              }
            />
          </Field>
        </FieldGroup>
      </details>
      <Tabs
        value={sheet === "cases" ? "cases" : "items"}
        onValueChange={setSheet}
      >
        <TabsList
          variant="line"
          className="flex h-auto w-full flex-wrap justify-start border-b"
        >
          {(["items", "cases"] as const).map((s) => (
            <TabsTrigger key={s} value={s} className="flex-none px-4 py-2">
              {sheetLabels[s]}
              {s !== "cases" &&
                ` (${design.items.filter((item) => !item.is_spacer).length})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="関連情報を開く"
      >
        {(
          [
            ["patterns", "パターン"],
            ["comments", "コメント"],
            ["requirements", "関連要件"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={inspector === value ? "secondary" : "ghost"}
            aria-expanded={inspector === value}
            onClick={() => setInspector(inspector === value ? null : value)}
          >
            {label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {activeItem?.code}
        </span>
      </div>
      <div className="flex min-w-0 items-start">
        <div className="min-w-0 flex-1">
          {sheet === "cases" && (
            <CasesSection
              projectId={design.project_id}
              designId={design.id}
              version={design.version}
              dirty={state.dirty}
              onEditDesign={(itemId, tableId) => {
                setSelectedItem(itemId);
                setFocusColumnKey(undefined);
                setActiveTable(tableId ?? null);
                setSheet("items");
                setInspector(tableId ? "patterns" : null);
              }}
            />
          )}
          <Activity mode={sheet === "cases" ? "hidden" : "visible"}>
            <DesignGrid
              key={`${selectedItem}:${focusColumnKey ?? ""}:${focusRequest}`}
              focusRowId={selectedItem}
              focusColumnKey={focusColumnKey}
              sheet="items"
              appendRow
              onSelection={(rowId, columnKey) => {
                const item = design.items.find((value) => value.id === rowId);
                if (!item || item.is_spacer) {
                  setActiveItemId("");
                  return;
                }
                setActiveItemId(item.id);
                if (columnKey !== "code") {
                  setCommentTarget({
                    target_type: "test_item",
                    target_id: item.id,
                    field: columnKey,
                  });
                  setCommentTargetLabel(
                    `${item.code} · ${grid.columns.find((column) => column.key === columnKey)?.label ?? columnKey}`,
                  );
                } else {
                  setCommentTarget({
                    target_type: "test_item",
                    target_id: item.id,
                  });
                  setCommentTargetLabel(item.code);
                }
              }}
              {...grid}
              cellCommentCount={(row, column) =>
                counts.get(
                  commentTargetKey({
                    target_type: "test_item",
                    target_id: row.id,
                    field: column.key === "code" ? undefined : column.key,
                  }),
                ) ?? 0
              }
              onCellComment={() => setInspector("comments")}
              renderCell={(row, column) => {
                if (column.key !== "pattern_table_id") return undefined;
                const item = design.items.find((i) => i.id === row.id);
                if (!item || item.is_spacer) return null;
                const table = design.pattern_tables?.find(
                  (t) => t.id === item.pattern_table_id,
                );
                return (
                  <PatternCell
                    itemCode={item.code}
                    table={table}
                    tables={design.pattern_tables ?? []}
                    readOnly={readOnly}
                    onOpen={() => table && openTable(table.id)}
                    onSelect={(id) =>
                      change((d) => {
                        d.items.find(
                          (i) => i.id === item.id,
                        )!.pattern_table_id = id || null;
                        d.links = d.links.filter((l) => l.item_id !== item.id);
                      })
                    }
                    onCreate={() =>
                      change((d) => {
                        openTable(
                          createPatternTable(d, item.id),
                          "definitions",
                        );
                      })
                    }
                  />
                );
              }}
              layout={design.layout}
              readOnly={readOnly}
              onUndo={state.undo}
              onRedo={state.redo}
              onEdit={(edits, count) =>
                change((d) => {
                  editCells(d, "items", edits, count);
                })
              }
              onLayout={(layout) =>
                change((d) => {
                  d.layout = layout;
                })
              }
              onAdd={() => change((d) => addRow(d, "items"))}
              onInsert={
                sheet !== "cases"
                  ? (beforeId, spacer) =>
                      change((d) => insertItem(d, beforeId, spacer))
                  : undefined
              }
              onDelete={(ids) => {
                confirm({
                  title: `${ids.length}行を削除しますか？`,
                  description: `関連する紐付けも削除します。生成済みケースは保持します。保存前は元に戻せます。`,
                  confirmLabel: "削除",
                  destructive: true,
                  onConfirm: () => change((d) => deleteRows(d, "items", ids)),
                });
              }}
              onAddColumn={
                sheet !== "cases"
                  ? () => {
                      const label = window.prompt("追加する列名");
                      if (label?.trim())
                        change((d) => {
                          if (d.columns.length >= 100)
                            throw new Error("任意列は100列までです");
                          const id = uid();
                          d.columns.push({
                            id,
                            key: `custom_${id}`,
                            label: label.trim(),
                            position: d.columns.length,
                          });
                        });
                    }
                  : undefined
              }
              onDeleteColumn={
                sheet !== "cases"
                  ? (key) => {
                      confirm({
                        title: "選択した列を削除しますか？",
                        description:
                          "この列の入力値も削除します。保存前は元に戻せます。",
                        confirmLabel: "削除",
                        destructive: true,
                        onConfirm: () =>
                          change((d) => {
                            d.columns = d.columns.filter((c) => c.key !== key);
                            d.items.forEach((i) => {
                              if (i.custom_values) delete i.custom_values[key];
                            });
                            d.layout.cells = Object.fromEntries(
                              Object.entries(d.layout.cells ?? {}).filter(
                                ([k]) => !k.endsWith(`:${key}`),
                              ),
                            );
                          }),
                      });
                    }
                  : undefined
              }
            />
          </Activity>
        </div>
        <DesignInspector
          active={inspector}
          onChange={setInspector}
          onClose={() => setInspector(null)}
        >
          <Activity mode={inspector === "patterns" ? "visible" : "hidden"}>
            {manager}
          </Activity>
          <Activity mode={inspector === "comments" ? "visible" : "hidden"}>
            {commentsPanel}
          </Activity>
          <Activity mode={inspector === "requirements" ? "visible" : "hidden"}>
            {activeItem ? (
              <RequirementLinksPanel
                projectId={design.project_id}
                designId={design.id}
                itemId={activeItem.id}
                itemCode={activeItem.code}
                disabled={readOnly || state.dirty}
                disabledMessage={
                  state.dirty
                    ? "設計書を保存すると紐付けを変更できます。"
                    : state.saving
                      ? "保存完了後に紐付けを変更できます。"
                      : !permissions.edit
                        ? "紐付けを変更する権限がありません。"
                        : undefined
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                テスト項目を選択してください。
              </p>
            )}
          </Activity>
        </DesignInspector>
      </div>
      <Dialog
        open={!!state.conflict}
        onOpenChange={(open) => {
          if (!open) state.dismissConflict();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ほかのユーザーが設計を更新しました</DialogTitle>
            <DialogDescription>
              編集内容は保持されています。退避ファイルを保存してから最新の設計を読み込み、変更を再適用してください。自動上書きは行いません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={state.exportDraft}>
              自分の編集内容を退避
            </Button>
            <Button
              onClick={() =>
                confirm({
                  title: "未保存の変更を破棄しますか？",
                  description:
                    "最新の設計を読み込みます。自分の編集内容は失われるため、必要であれば先に退避してください。",
                  confirmLabel: "破棄して読み込む",
                  destructive: true,
                  onConfirm: state.useLatest,
                })
              }
            >
              最新の設計を読み込む
            </Button>
            <Button variant="outline" onClick={state.dismissConflict}>
              編集に戻る
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...state.confirmDialogProps} />
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
