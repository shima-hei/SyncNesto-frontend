import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/display/status-badge";
import type { TaskRequirementSummary } from "@/lib/api/generated/model";

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
    <StatusBadge tone={getTaskStatusTone(status)}>
      {getTaskStatusLabel(status)}
    </StatusBadge>
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
      {isOverdue ? <StatusBadge tone="warning">期限超過</StatusBadge> : null}
      {isBlocked ? <StatusBadge tone="danger">ブロック中</StatusBadge> : null}
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

const taskStatusTones: Record<string, StatusTone> = {
  todo: "info",
  in_progress: "progress",
  in_review: "warning",
  done: "success",
  blocked: "danger",
};

const getTaskStatusTone = (status?: string | null): StatusTone =>
  status ? (taskStatusTones[status] ?? "neutral") : "neutral";
