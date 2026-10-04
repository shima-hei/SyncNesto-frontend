"use client";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
export function useDesignPermissions(projectId: number) {
  const { currentProjectRole: role } = useCurrentProjectRole(projectId);
  const admin = role?.role?.key === "project_admin";
  const key = role?.role?.key ?? "";
  return {
    edit: !!admin || ["manager", "member"].includes(key),
    delete: !!admin,
    generate: !!admin || key === "manager",
    execute: !!admin || ["manager", "member"].includes(key),
  };
}
