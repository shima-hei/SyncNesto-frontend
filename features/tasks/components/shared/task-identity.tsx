import type { TaskRead } from "@/lib/api/generated/model";

type TaskIdentityProps = {
  task?: Pick<TaskRead, "task_code" | "title"> | null;
  fallbackTaskId?: number;
  className?: string;
  titleClassName?: string;
};

export function TaskIdentity({
  task,
  fallbackTaskId,
  className,
  titleClassName,
}: TaskIdentityProps) {
  if (!task) {
    return (
      <span className={className}>
        {fallbackTaskId ? `TASK-${fallbackTaskId}` : "タスク未取得"}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-muted-foreground">{task.task_code}</span>
      <span className="text-muted-foreground">：</span>
      <span className={titleClassName}>{task.title}</span>
    </span>
  );
}
