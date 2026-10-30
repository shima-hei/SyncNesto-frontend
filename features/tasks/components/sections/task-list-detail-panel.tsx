"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { ExternalLinkIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { formatDate } from "@/lib/format/date";
import { useTask } from "../../hooks/use-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { TaskStatusBadge, TaskRequirementBadges } from "../shared/task-badges";
import { TaskHierarchyBadge } from "../shared/task-hierarchy-badge";
import { effortBasisLabel } from "../../lib/task-effort";
import { TaskListQuickEdit, TaskListDraftNotice } from "./task-list-quick-edit";
import type { TaskListEditingController } from "../../hooks/use-task-list-editing";

const wideQuery = "(min-width: 1280px)";
function subscribeWide(callback: () => void) {
  const media = window.matchMedia(wideQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getWide = () => window.matchMedia(wideQuery).matches;
const getServerWide = () => false;

export function TaskListDetailPanel({
  projectId,
  taskId,
  inView,
  onSelect,
  onClose,
  onRestoreFocus,
  onNavigate,
  canUpdate,
  editor,
}: {
  projectId: number;
  taskId: number | null;
  inView: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
  onNavigate: (id: number) => void;
  canUpdate: boolean;
  editor: TaskListEditingController;
}) {
  const wide = useSyncExternalStore(subscribeWide, getWide, getServerWide);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!wide || !taskId) return;
    const panel = panelRef.current;
    if (!panel) return;
    let frame = 0;
    const measure = () => {
      panel.style.maxHeight = `${Math.max(240, window.innerHeight - Math.max(16, panel.getBoundingClientRect().top) - 16)}px`;
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [wide, taskId]);
  const { task: loaded, isLoading, error } = useTask(taskId);
  const task = !error && loaded?.project_id === projectId ? loaded : null;
  const { task: parentLoaded, error: parentError } = useTask(
    task?.parent_task_id,
  );
  const parent =
    !parentError && parentLoaded?.project_id === projectId
      ? parentLoaded
      : null;
  const { usersById } = useTaskUserMap(projectId);
  useEffect(() => {
    if (wide && taskId) closeRef.current?.focus({ preventScroll: true });
  }, [wide, taskId]);
  if (!taskId) return null;
  const close = (
    <Button
      ref={closeRef}
      variant="ghost"
      size="icon-sm"
      aria-label="簡易詳細を閉じる"
      onClick={onClose}
    >
      <XIcon />
    </Button>
  );
  const title =
    task?.title ??
    (isLoading ? "タスクを読み込んでいます" : "タスクを確認できません");
  const description =
    task?.task_code ?? "既存のタスク詳細から内容を確認します。";
  const body = (
    <>
      {!inView && task ? (
        <p className="border-b p-4 text-sm text-muted-foreground">
          このタスクは現在の表示範囲外です。選択を保持しています。
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <TaskListDraftNotice editor={editor} />
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : !task ? (
          <p role="alert">
            削除・権限・参照先を確認してください。名称を確認できないタスクは表示しません。
          </p>
        ) : (
          <>
            {canUpdate ? (
              <TaskListQuickEdit
                projectId={projectId}
                task={task}
                editor={editor}
              />
            ) : null}
            <dl className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 text-sm [&>dt]:text-muted-foreground [&>dd]:min-w-0 [&>dd]:break-words">
              {!canUpdate ? (
                <>
                  <dt>状態</dt>
                  <dd>
                    <TaskStatusBadge status={task.status} />
                  </dd>
                  <dt>担当</dt>
                  <dd>
                    {task.assignee_id
                      ? (usersById.get(task.assignee_id)?.name ??
                        "担当者を確認できません")
                      : "未割当"}
                  </dd>
                  <dt>期限</dt>
                  <dd>
                    {formatDate(task.due_date)}
                    {task.is_overdue ? (
                      <p className="text-xs text-warning">期限超過</p>
                    ) : null}
                  </dd>
                </>
              ) : null}
              <dt>階層</dt>
              <dd>
                <TaskHierarchyBadge task={task} />
              </dd>
              <dt>親タスク</dt>
              <dd>
                {parent ? (
                  <Button
                    variant="link"
                    className="h-auto min-w-0 whitespace-normal p-0 text-left"
                    onClick={() => onSelect(parent.id)}
                  >
                    {parent.title}
                  </Button>
                ) : task.parent_task_id ? (
                  "親の名称を確認できません"
                ) : (
                  "なし"
                )}
              </dd>
              <dt>関連要件</dt>
              <dd>
                {task.requirements?.length ? (
                  <TaskRequirementBadges requirements={task.requirements} />
                ) : (
                  "未設定"
                )}
              </dd>
              <dt>見積入力</dt>
              <dd>
                {task.estimated_minutes == null
                  ? "未設定"
                  : `${task.estimated_minutes}分`}
                （{effortBasisLabel(task.estimated_basis)}）
              </dd>
            </dl>
            <Separator />
            <section
              aria-label="タスクの説明"
              className="max-h-64 overflow-y-auto"
            >
              <MarkdownPreview
                className="min-h-0"
                value={task.description ?? ""}
                emptyMessage="説明はありません。"
              />
            </section>
            <p className="text-xs text-muted-foreground">
              詳しい編集・コメント・変更履歴・依存関係は詳細ページで確認できます。
            </p>
          </>
        )}
      </div>
      {task ? (
        <footer className="border-t p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onNavigate(task.id)}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            独立した詳細を開く
          </Button>
        </footer>
      ) : null}
    </>
  );
  if (wide)
    return (
      <aside
        ref={panelRef}
        aria-labelledby="task-list-panel-title"
        className="sticky top-4 flex max-h-[calc(100dvh-5rem)] min-w-0 flex-col self-start rounded-lg border bg-background"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <header className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{description}</p>
            <h2
              id="task-list-panel-title"
              className="mt-1 break-words font-semibold"
            >
              {title}
            </h2>
          </div>
          {close}
        </header>
        {body}
      </aside>
    );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-[min(100vw,28rem)] data-[side=right]:sm:max-w-none"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <SheetHeader className="flex-row items-start justify-between border-b">
          <div className="min-w-0">
            <SheetDescription>{description}</SheetDescription>
            <SheetTitle className="break-words">{title}</SheetTitle>
          </div>
          {close}
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
