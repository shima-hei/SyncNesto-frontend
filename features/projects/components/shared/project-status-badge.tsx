import { Badge } from "@/components/ui/badge";

import { getProjectStatusLabel } from "../../constants/project-form";

type ProjectStatusBadgeProps = {
  status?: string | null;
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {getProjectStatusLabel(status)}
    </Badge>
  );
}
