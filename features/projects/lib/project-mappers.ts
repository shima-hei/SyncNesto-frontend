import type {
  ProjectCreate,
  ProjectMemberCreate,
  ProjectMemberUpdate,
  ProjectUpdate,
} from "@/lib/api/generated/model";

import type { ProjectMemberFormValues } from "../types/project-member-form";
import type { ProjectFormValues } from "../types/project-form";

export const toProjectCreate = (
  values: ProjectFormValues
): ProjectCreate => {
  return {
    project_code: values.projectCode,
    name: values.name,
    description: values.description || null,
    status: values.status,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
  };
};

export const toProjectUpdate = (
  values: ProjectFormValues,
  version: number
): ProjectUpdate => {
  return {
    version,
    ...toProjectCreate(values),
  };
};

export const toProjectMemberCreate = (
  values: ProjectMemberFormValues
): ProjectMemberCreate => {
  return {
    user_id: values.userId ?? 0,
    role_key: values.roleKey,
  };
};

export const toProjectMemberUpdate = (
  version: number,
  roleKey: string
): ProjectMemberUpdate => {
  return {
    version,
    role_key: roleKey,
  };
};
