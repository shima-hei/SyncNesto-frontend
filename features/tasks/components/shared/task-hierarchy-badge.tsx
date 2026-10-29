import { Badge } from "@/components/ui/badge";
import type { TaskRead } from "@/lib/api/generated/model";
import { getTaskHierarchyLabel } from "../../lib/task-list-filters";

export function TaskHierarchyBadge({ task }: { task: TaskRead }) {
  const label = getTaskHierarchyLabel(task);
  return label ? <Badge variant="outline">{label}</Badge> : null;
}
