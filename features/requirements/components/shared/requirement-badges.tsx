import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  getRequirementDocumentStatusLabel,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../constants/requirement-options";

export function RequirementDocumentStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return (
    <Badge variant="outline" className={getRequirementStatusClassName(status)}>
      {getRequirementDocumentStatusLabel(status)}
    </Badge>
  );
}

export function RequirementStatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge variant="outline" className={getRequirementStatusClassName(status)}>
      {getRequirementStatusLabel(status)}
    </Badge>
  );
}

export function RequirementPriorityBadge({
  priority,
}: {
  priority?: string | null;
}) {
  return (
    <Badge variant="secondary">{getRequirementPriorityLabel(priority)}</Badge>
  );
}

export function RequirementTypeBadge({ type }: { type?: string | null }) {
  return <Badge variant="outline">{getRequirementTypeLabel(type)}</Badge>;
}

const getRequirementStatusClassName = (status?: string | null) => {
  return cn(
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
    (status === "reviewing" || status === "requested") &&
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
    (status === "implementing" || status === "in_review") &&
      "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
    (status === "approved" ||
      status === "implemented" ||
      status === "tested" ||
      status === "resolved") &&
      "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
    (status === "rejected" || status === "deprecated") &&
      "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
    status === "on_hold" &&
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
  );
};
