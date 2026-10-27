"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { listVerdicts } from "@/features/requirement-verifications/lib/verdict-api";

export function useRequirementVerdicts(projectId: number, ids: number[]) {
  const { user } = useAuth(),
    { tenant } = useTenant();
  const selected = [...new Set(ids)].sort((a, b) => a - b);
  return useQuery({
    queryKey: [
      "requirement-verdict-summary",
      tenant?.id,
      user?.id,
      projectId,
      selected,
    ],
    queryFn: ({ signal }) =>
      listVerdicts(projectId, { requirement_ids: selected }, { signal }),
    enabled: Boolean(user && tenant && projectId > 0 && selected.length),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
