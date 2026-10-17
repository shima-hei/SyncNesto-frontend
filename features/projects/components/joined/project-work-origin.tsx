"use client";

import Link from "next/link";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import { taskOriginHref } from "@/lib/navigation/task-origin";
import { Button } from "@/components/ui/button";

export function ProjectWorkOrigin({ projectId }: { projectId: number }) {
  const { origin } = useTaskOrigin(projectId);
  if (!origin) return null;
  return (
    <section
      aria-label="元の作業への復帰"
      className="flex flex-wrap items-center gap-2 border-b pb-3 text-sm"
    >
      <p className="mr-auto">作業の起点: タスク #{origin.taskId}</p>
      <Button asChild variant="outline" size="sm">
        <Link href={taskOriginHref(origin)}>元のタスクへ戻る</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={origin.listReturn}>元のタスク一覧へ</Link>
      </Button>
    </section>
  );
}
