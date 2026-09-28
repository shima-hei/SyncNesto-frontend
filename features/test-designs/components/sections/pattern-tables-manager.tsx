"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { TestDesignCommentRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";
import { type Design } from "../../lib/design";
import {
  createPatternTable,
  deletePatternTable,
  tableDesign,
  editPatternTable,
} from "../../lib/pattern-tables";
import { PatternMatrix } from "../tables/pattern-matrix";
import { PatternDefinitions } from "./pattern-definitions";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import {
  commentCounts,
  commentScopeKey,
  matrixCommentFocus,
  patternCommentIndex,
  type DesignCommentTarget,
} from "../../lib/pattern-comments";

export type PatternTab = "definitions" | "combinations" | "usage";

function PatternUsage({
  items,
  onItem,
}: {
  items: Design["items"];
  onItem: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase();
  const visible = items.filter((item) =>
    `${item.code} ${item.content ?? ""} ${item.viewpoint ?? ""} ${item.target_feature ?? ""}`
      .toLocaleLowerCase()
      .includes(term),
  );
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">このパターンを使用しているテスト項目</h3>
      <Input
        type="search"
        aria-label="使用テスト項目を検索"
        placeholder="項目番号・テスト内容で検索"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {visible.length} / {items.length}件
      </p>
      <div className="max-h-[560px] overflow-y-auto divide-y rounded-md border">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-start gap-4 p-3 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            onClick={() => onItem(item.id)}
          >
            <span className="shrink-0 font-medium">{item.code}</span>
            <span className="min-w-0 break-words whitespace-pre-wrap">
              {item.content || "テスト内容未入力"}
            </span>
          </button>
        ))}
        {!visible.length && (
          <p className="p-4 text-sm text-muted-foreground">
            {items.length
              ? "該当するテスト項目はありません。"
              : "このパターンを使用しているテスト項目はありません。テスト項目の「パターン」セルから紐付けできます。"}
          </p>
        )}
      </div>
    </section>
  );
}

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
  onCommentTarget,
  onOpenComments,
  onCloseComments,
  commentsOpen,
  commentsPanel,
  comments,
  tab,
  onTabChange,
  commentFocus,
}: {
  design: Design;
  change: (f: (d: Design) => void) => void;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  activeId: string | null;
  onOpen: (id: string, tab?: PatternTab) => void;
  onClose: () => void;
  onItem: (id: string) => void;
  onCommentTarget: (target: DesignCommentTarget, label: string) => void;
  onOpenComments: () => void;
  onCloseComments: () => void;
  commentsOpen: boolean;
  commentsPanel: ReactNode;
  comments: TestDesignCommentRead[];
  tab: PatternTab;
  onTabChange: (tab: PatternTab) => void;
  commentFocus: { target: DesignCommentTarget; request: number } | null;
}) {
  const { confirm, confirmDialogProps } = useConfirmAction();
  const table = design.pattern_tables?.find((value) => value.id === activeId);
  const scoped = useMemo(
    () => (table ? tableDesign(design, table.id) : null),
    [design, table],
  );
  const counts = useMemo(() => commentCounts(comments), [comments]);
  const index = useMemo(() => patternCommentIndex(design), [design]);
  const stats = useMemo(() => {
    const result = new Map(
      (design.pattern_tables ?? []).map((table) => [
        table.id,
        { factors: 0, combinations: 0, used: 0, comments: 0 },
      ]),
    );
    for (const factor of design.factors) {
      const row = result.get(factor.table_id ?? "");
      if (row) row.factors++;
    }
    for (const pattern of design.patterns) {
      const row = result.get(pattern.table_id ?? "");
      if (row && pattern.enabled !== false) row.combinations++;
    }
    for (const item of design.items) {
      const row = result.get(item.pattern_table_id ?? "");
      if (row && !item.is_spacer) row.used++;
    }
    for (const comment of comments) {
      const row = result.get(index.tables.get(commentScopeKey(comment)) ?? "");
      if (row && !comment.deleted_at) row.comments++;
    }
    return result;
  }, [design, comments, index]);
  const openComment = (target: DesignCommentTarget, label: string) => {
    onCommentTarget(target, label);
    onOpenComments();
  };
  const tableComment = (id: string, name: string) =>
    openComment(
      { target_type: "pattern_table", target_id: id, field: "name" },
      `パターン表 · ${name}`,
    );
  const deleteMenu = (id: string, name: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={readOnly}
          aria-label={`${name}の操作`}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              confirm({
                title: `「${name}」を削除しますか？`,
                description: `使用中の${stats.get(id)?.used ?? 0}件の項目はパターン表なしになります。既存のケース結果は保持します。`,
                confirmLabel: "削除",
                destructive: true,
                onConfirm: () => {
                  change((d) => deletePatternTable(d, id));
                  if (activeId === id) onClose();
                },
              })
            }
          >
            <Trash2Icon />
            パターン表を削除
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <>
      {table && scoped ? (
        <section className="@container flex min-w-0 flex-col gap-3">
          <Button
            variant="link"
            size="sm"
            className="self-start px-0 text-muted-foreground"
            onClick={onClose}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            パターン管理一覧
          </Button>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="sr-only">{table.name}</h2>
              <Input
                aria-label="パターン表名"
                className="h-10 border-transparent px-0 text-xl font-semibold shadow-none hover:border-input focus-visible:border-input md:text-xl"
                disabled={readOnly}
                value={table.name}
                onChange={(event) =>
                  change((d) => {
                    d.pattern_tables!.find(
                      (value) => value.id === table.id,
                    )!.name = event.target.value;
                  })
                }
              />
              <button
                type="button"
                className="rounded text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => onTabChange("usage")}
              >
                {stats.get(table.id)?.used ?? 0}テスト項目で使用
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => tableComment(table.id, table.name)}
              aria-expanded={commentsOpen}
            >
              <MessageSquareIcon data-icon="inline-start" />
              コメント {stats.get(table.id)?.comments ?? 0}件
            </Button>
            {deleteMenu(table.id, table.name)}
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value as PatternTab)}
          >
            <TabsList variant="line" className="max-w-full">
              <TabsTrigger value="definitions">因子・水準</TabsTrigger>
              <TabsTrigger value="combinations">組み合わせ</TabsTrigger>
              <TabsTrigger value="usage">使用テスト項目</TabsTrigger>
            </TabsList>
            <div
              className={cn(
                "relative mt-3 grid min-w-0 gap-4",
                commentsOpen && "@[1100px]:grid-cols-[minmax(0,1fr)_22rem]",
              )}
            >
              <div className="min-w-0">
                <TabsContent value="definitions" className="mt-0">
                  <PatternDefinitions
                    design={scoped}
                    change={(mutate) =>
                      change((d) => editPatternTable(d, table.id, mutate))
                    }
                    readOnly={readOnly}
                    counts={counts}
                    onComment={openComment}
                  />
                </TabsContent>
                <TabsContent value="combinations" className="mt-0">
                  <PatternMatrix
                    key={`${table.id}:${commentFocus?.request ?? 0}`}
                    design={scoped}
                    change={(mutate) =>
                      change((d) => editPatternTable(d, table.id, mutate))
                    }
                    readOnly={readOnly}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    counts={counts}
                    focus={
                      commentFocus
                        ? matrixCommentFocus(scoped, commentFocus.target)
                        : null
                    }
                    onCommentTarget={onCommentTarget}
                    onOpenComments={onOpenComments}
                  />
                </TabsContent>
                <TabsContent value="usage" className="mt-0">
                  <PatternUsage
                    key={table.id}
                    items={scoped.items.filter((item) => !item.is_spacer)}
                    onItem={onItem}
                  />
                </TabsContent>
              </div>
              {
                <aside
                  aria-label="パターンのコメントパネル"
                  className={cn(
                    "absolute inset-y-0 right-0 z-30 flex max-h-[680px] w-[min(24rem,100%)] flex-col border bg-background p-3 shadow-lg @[1100px]:static @[1100px]:w-auto @[1100px]:border-0 @[1100px]:border-l @[1100px]:shadow-none",
                    !commentsOpen && "hidden",
                  )}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Escape" &&
                      !event.nativeEvent.isComposing &&
                      event.keyCode !== 229
                    ) {
                      event.stopPropagation();
                      onCloseComments();
                    }
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="font-semibold">コメント</h3>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="コメントパネルを閉じる"
                      onClick={onCloseComments}
                    >
                      <XIcon />
                    </Button>
                  </div>
                  <div className="min-h-0 overflow-y-auto">{commentsPanel}</div>
                </aside>
              }
            </div>
          </Tabs>
        </section>
      ) : (
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">用途ごとのパターン表</h2>
            <Button
              disabled={readOnly}
              onClick={() => change((d) => onOpen(createPatternTable(d)))}
            >
              <PlusIcon data-icon="inline-start" />
              新しいパターン表を作成
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>パターン表</TableHead>
                <TableHead>因子数</TableHead>
                <TableHead>有効な組み合わせ</TableHead>
                <TableHead>使用テスト項目</TableHead>
                <TableHead>コメント</TableHead>
                <TableHead>
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(design.pattern_tables ?? []).map((value) => (
                <TableRow
                  key={value.id}
                  tabIndex={0}
                  className="cursor-pointer hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`${value.name}を開く`}
                  onClick={() => onOpen(value.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(value.id);
                    }
                  }}
                >
                  <TableCell className="font-medium">{value.name}</TableCell>
                  <TableCell>{stats.get(value.id)?.factors ?? 0}</TableCell>
                  <TableCell>
                    {stats.get(value.id)?.combinations ?? 0}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(value.id, "usage");
                      }}
                    >
                      {stats.get(value.id)?.used ?? 0}件
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${value.name}のコメントを開く`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(value.id);
                        tableComment(value.id, value.name);
                      }}
                    >
                      <MessageSquareIcon data-icon="inline-start" />
                      {stats.get(value.id)?.comments ?? 0}件
                    </Button>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {deleteMenu(value.id, value.name)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!design.pattern_tables?.length && (
            <p className="text-sm text-muted-foreground">
              必要な用途ごとにパターン表を作成できます。表を使用しない項目も1ケースとして生成されます。
            </p>
          )}
        </section>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
