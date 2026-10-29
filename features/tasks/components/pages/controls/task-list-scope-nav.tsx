"use client";

import Link from "next/link";
import { ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useListNavigation } from "@/hooks/use-list-navigation";
import type { TaskRead } from "@/lib/api/generated/model";
import type { TaskListScope } from "../../../lib/task-list-scope";

type TaskListScopeNavProps = {
  projectId: number;
  scope: TaskListScope;
  parentTask: TaskRead | null;
  isParentLoading: boolean;
  parentUnavailable: boolean;
  onScopeChange: (scope: TaskListScope) => void;
  onRetryParent: () => void;
};

export function TaskListScopeNav({
  projectId,
  scope,
  parentTask,
  isParentLoading,
  parentUnavailable,
  onScopeChange,
  onRetryParent,
}: TaskListScopeNavProps) {
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/tasks`,
  );
  return (
    <section
      aria-label="タスクの閲覧範囲"
      className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">閲覧範囲</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={scope.kind}
          aria-label="閲覧範囲を選択"
          onValueChange={(value) => {
            if (value === "all" || value === "roots")
              onScopeChange({ kind: value });
          }}
          className="max-w-full flex-wrap"
        >
          <ToggleGroupItem value="all">すべて</ToggleGroupItem>
          <ToggleGroupItem value="roots">親なしから探す</ToggleGroupItem>
          <ToggleGroupItem
            value="children"
            disabled={scope.kind !== "children"}
          >
            選んだ親の子
          </ToggleGroupItem>
        </ToggleGroup>
        {scope.kind !== "all" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onScopeChange({ kind: "all" })}
          >
            全体へ
          </Button>
        ) : null}
      </div>
      <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
        {scope.kind === "children" ? (
          <>
            {parentTask ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    選択中の親タスク
                  </p>
                  <Link
                    className="block break-words font-medium underline-offset-4 hover:underline"
                    href={withReturn(
                      `/projects/joined/${projectId}/tasks/${parentTask.id}`,
                    )}
                  >
                    {parentTask.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {parentTask.task_code} · ID: {parentTask.id}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onScopeChange(
                      parentTask.parent_task_id
                        ? {
                            kind: "children",
                            parentTaskId: parentTask.parent_task_id,
                          }
                        : { kind: "roots" },
                    )
                  }
                >
                  <ArrowUpIcon data-icon="inline-start" />
                  一つ上
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isParentLoading
                  ? "親タスクの名称を読み込んでいます。"
                  : "親タスクの名称を確認できません。"}
                <span className="ml-2">ID: {scope.parentTaskId}</span>
                {parentUnavailable ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={onRetryParent}
                  >
                    再取得
                  </Button>
                ) : null}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              この親の直属の子を表示します。孫以降は各行の「子を見る」から辿れます。検索・絞り込み条件も適用されます。
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {scope.kind === "roots"
              ? "親を持たないタスクを表示します。"
              : "階層を問わず、条件に合うタスクを表示します。"}{" "}
            各行の「子を見る」で親ごとに辿れます。
          </p>
        )}
      </div>
    </section>
  );
}
