"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import type { RequirementRead } from "@/lib/api/generated/model";
import { readRequirementItemWorkflowStatesProjectsProjectIdRequirementWorkflowItemStatesGet as readItemStates } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

export function useRequirementItemWorkflow(
  projectId: number,
  requirements: Pick<RequirementRead, "id" | "version">[],
) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const items = [...requirements].sort((a, b) => a.id - b.id);
  return useQuery({
    queryKey: [
      "requirement-workflow",
      projectId,
      "item-states",
      tenant?.id,
      user?.id,
      items.map(({ id, version }) => [id, version]),
    ],
    queryFn: ({ signal }) =>
      readItemStates(
        projectId,
        { requirement_ids: items.map((item) => item.id) },
        { signal },
      ),
    enabled: Boolean(
      user?.user_type === "internal" &&
      !user.demo &&
      tenant &&
      projectId > 0 &&
      items.length,
    ),
    retry: false,
  });
}
