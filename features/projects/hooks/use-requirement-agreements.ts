"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { readRequirementAgreementsProjectsProjectIdRequirementAgreementsGet as readAgreements } from "@/lib/api/generated/requirement-agreements/requirement-agreements";

export function useRequirementAgreements(projectId: number, ids: number[]) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const selected = [...new Set(ids)].sort((a, b) => a - b);
  return useQuery({
    queryKey: [
      "requirement-agreements",
      tenant?.id,
      user?.id,
      projectId,
      selected,
    ],
    queryFn: ({ signal }) =>
      readAgreements(projectId, { requirement_ids: selected }, { signal }),
    enabled: Boolean(user && tenant && projectId > 0 && selected.length),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
