import type { GanttResponse, TaskRead } from "@/lib/api/generated/model";

export function GanttDependenciesSummary({
  tasks,
  dependencies,
}: {
  tasks: TaskRead[];
  dependencies: NonNullable<GanttResponse["dependencies"]>;
}) {
  const taskCodeById = new Map(tasks.map((task) => [task.id, task.task_code]));

  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-sm font-medium">依存関係</h3>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {dependencies.map((dependency) => (
          <p key={dependency.id}>
            <span className="font-medium text-foreground">
              {taskCodeById.get(dependency.predecessor_task_id) ??
                `TASK-${dependency.predecessor_task_id}`}
            </span>
            <span className="mx-2">完了後に</span>
            <span className="font-medium text-foreground">
              {taskCodeById.get(dependency.successor_task_id) ??
                `TASK-${dependency.successor_task_id}`}
            </span>
            <span className="ml-2">を開始 / ラグ {dependency.lag_days}日</span>
          </p>
        ))}
      </div>
    </div>
  );
}
