import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { getProjectStatusLabel } from "../../constants/project-form";

type ProjectStatusBadgeProps = {
  status?: string | null;
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant="outline" className={getProjectStatusClassName(status)}>
      {getProjectStatusLabel(status)}
    </Badge>
  );
}

const getProjectStatusClassName = (status?: string | null) => {
  return cn(
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
    status === "active" &&
      "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
    status === "archived" &&
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]"
  );
};
