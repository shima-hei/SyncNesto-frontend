import type { ProjectRead } from "@/lib/api/generated/model";

import type { ProjectFormValues } from "../types/project-form";

export const PROJECT_STATUS_OPTIONS = [
  {
    value: "active",
    label: "有効",
  },
  {
    value: "archived",
    label: "アーカイブ",
  },
] as const;

export const projectInitialValues: ProjectFormValues = {
  projectCode: "",
  name: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
};

export const getProjectFormValues = (
  project: ProjectRead
): ProjectFormValues => {
  return {
    projectCode: project.project_code,
    name: project.name,
    description: project.description ?? "",
    status: project.status ?? "active",
    startDate: project.start_date ?? "",
    endDate: project.end_date ?? "",
  };
};

export const getProjectStatusLabel = (status?: string | null) => {
  return (
    PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status ??
    "-"
  );
};
