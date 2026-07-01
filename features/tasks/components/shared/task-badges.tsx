import { Badge } from "@/components/ui/badge";
import type { TaskRequirementSummary } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import {
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "../../constants/task-options";

export function TaskTypeBadge({ type }: { type?: string | null }) {
  return <Badge variant="outline">{getTaskTypeLabel(type)}</Badge>;
}

export function TaskStatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge variant="outline" className={getTaskStatusClassName(status)}>
      {getTaskStatusLabel(status)}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority?: string | null }) {
  const variant =
    priority === "critical" || priority === "high" ? "destructive" : "outline";

  return <Badge variant={variant}>{getTaskPriorityLabel(priority)}</Badge>;
}

export function TaskFlagBadges({
  isOverdue,
  isBlocked,
}: {
  isOverdue?: boolean;
  isBlocked?: boolean;
}) {
  if (!isOverdue && !isBlocked) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {isOverdue ? <Badge variant="destructive">期限超過</Badge> : null}
      {isBlocked ? <Badge variant="outline">ブロック中</Badge> : null}
    </div>
  );
}

export function TaskTags({ tags }: { tags?: string[] | null }) {
  if (!tags?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

export function TaskRequirementBadges({
  requirements,
}: {
  requirements?: TaskRequirementSummary[] | null;
}) {
  if (!requirements?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {requirements.map((requirement) => (
        <Badge key={requirement.relation_id} variant="outline">
          {requirement.requirement_code}
        </Badge>
      ))}
    </div>
  );
}

const getTaskStatusClassName = (status?: string | null) => {
  return cn(
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
    status === "todo" &&
      "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
    status === "in_progress" &&
      "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
    status === "in_review" &&
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
    status === "done" &&
      "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
    status === "blocked" &&
      "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
  );
};
