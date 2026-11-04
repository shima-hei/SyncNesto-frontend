"use client";

import { usePathname } from "next/navigation";
import { useListTaskTypesProjectsProjectIdTaskTypesGet } from "@/lib/api/generated/tasks/tasks";
import type { TaskTypeRead } from "@/lib/api/generated/model";
import { getJoinedProjectId } from "@/features/projects/constants/joined-project-navigation";
import { TASK_TYPE_OPTIONS } from "../constants/task-options";

const standardTypes: TaskTypeRead[] = TASK_TYPE_OPTIONS.map(
  ({ value, label }) => ({
    key: value,
    name: label,
    source: "standard",
    is_active: true,
    version: null,
  }),
);

export function useTaskTypes(projectId?: number) {
  const pathname = usePathname();
  const id = projectId ?? getJoinedProjectId(pathname);
  const query = useListTaskTypesProjectsProjectIdTaskTypesGet(id ?? 0, {
    query: { enabled: Boolean(id), staleTime: 60_000 },
  });
  const types = query.data?.items ?? standardTypes;
  const options = (current?: string, includeInactive = false) => {
    const rows = types.filter(
      (item) =>
        item.key && (includeInactive || item.is_active || item.key === current),
    );
    const result = rows.map((item) => ({
      value: item.key,
      label: `${item.name}${item.is_active ? "" : "（非表示）"}`,
    }));
    if (current && !result.some((item) => item.value === current))
      result.push({ value: current, label: current });
    return result;
  };
  return {
    query,
    types,
    options,
    name: (key: string) => types.find((item) => item.key === key)?.name ?? key,
  };
}
