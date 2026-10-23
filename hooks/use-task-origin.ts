"use client";

import { useSearchParams } from "next/navigation";
import { withOverviewOrigin } from "@/lib/navigation/overview-origin";
import {
  readTaskOrigin,
  withTaskOrigin,
  type TaskOrigin,
} from "@/lib/navigation/task-origin";

export function useTaskOrigin(projectId: number, source?: TaskOrigin) {
  const params = useSearchParams();
  const origin = source ?? readTaskOrigin(params, projectId);
  return {
    origin,
    withOrigin: (href: string) =>
      withOverviewOrigin(
        withTaskOrigin(href, origin),
        projectId,
        params.get("overviewReturn"),
      ),
  };
}
