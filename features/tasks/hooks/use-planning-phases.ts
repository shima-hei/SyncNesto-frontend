"use client";

import { useQuery } from "@tanstack/react-query";

import type { PhaseListItem } from "@/lib/api/generated/model";
import {
  getListPhasesProjectsProjectIdPhasesGetQueryKey,
  listPhasesProjectsProjectIdPhasesGet,
} from "@/lib/api/generated/tasks/tasks";

const pageSize = 100;

export function usePlanningPhases(projectId: number) {
  return useQuery({
    queryKey: [
      ...getListPhasesProjectsProjectIdPhasesGetQueryKey(projectId),
      "planning",
    ],
    retry: false,
    queryFn: async ({ signal }) => {
      const phases = new Map<number, PhaseListItem>();
      for (let page = 1; ; page++) {
        const result = await listPhasesProjectsProjectIdPhasesGet(
          projectId,
          { page, page_size: pageSize, include_archived: true },
          { signal },
        );
        for (const phase of result.items) phases.set(phase.id, phase);
        if (!result.items.length || page * pageSize >= result.total)
          return Array.from(phases.values());
      }
    },
  });
}
