import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/display/status-badge";

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
    <StatusBadge tone={getRequirementStatusTone(status)}>
      {getRequirementDocumentStatusLabel(status)}
    </StatusBadge>
  );
}

export function RequirementStatusBadge({ status }: { status?: string | null }) {
  return (
    <StatusBadge tone={getRequirementStatusTone(status)}>
      {getRequirementStatusLabel(status)}
    </StatusBadge>
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

const requirementStatusTones: Record<string, StatusTone> = {
  reviewing: "warning",
  requested: "warning",
  implementing: "progress",
  in_review: "progress",
  approved: "success",
  implemented: "success",
  tested: "success",
  resolved: "success",
  rejected: "danger",
  deprecated: "danger",
  on_hold: "warning",
};

const getRequirementStatusTone = (status?: string | null): StatusTone =>
  status ? (requirementStatusTones[status] ?? "neutral") : "neutral";
