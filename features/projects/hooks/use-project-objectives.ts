"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { readProjectObjectivesProjectsProjectIdObjectivesGet } from "@/lib/api/generated/project-objectives/project-objectives";

export function useProjectObjectives(projectId: number) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["project-objectives", tenant?.id, user?.id, projectId],
    queryFn: () =>
      readProjectObjectivesProjectsProjectIdObjectivesGet(projectId),
    enabled: projectId > 0 && Boolean(user && tenant),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
