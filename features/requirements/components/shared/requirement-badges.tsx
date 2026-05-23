import { Badge } from "@/components/ui/badge";

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
  return <Badge variant="outline">{getRequirementDocumentStatusLabel(status)}</Badge>;
}

export function RequirementStatusBadge({ status }: { status?: string | null }) {
  return <Badge variant="outline">{getRequirementStatusLabel(status)}</Badge>;
}

export function RequirementPriorityBadge({
  priority,
}: {
  priority?: string | null;
}) {
  return <Badge variant="secondary">{getRequirementPriorityLabel(priority)}</Badge>;
}

export function RequirementTypeBadge({ type }: { type?: string | null }) {
  return <Badge variant="outline">{getRequirementTypeLabel(type)}</Badge>;
}
