import type {
  MilestoneCreate,
  MilestoneRead,
  MilestoneUpdate,
} from "@/lib/api/generated/model";

import type { MilestoneFormValues } from "../types/milestone-form";

export const defaultMilestoneFormValues: MilestoneFormValues = {
  title: "",
  description: "",
  targetDate: "",
  status: "planned",
};

export const getMilestoneFormValues = (
  milestone: MilestoneRead,
): MilestoneFormValues => {
  return {
    title: milestone.title,
    description: milestone.description ?? "",
    targetDate: milestone.target_date,
    status: milestone.status ?? "planned",
  };
};

export const toMilestoneCreate = (
  values: MilestoneFormValues,
): MilestoneCreate => {
  return {
    title: values.title.trim(),
    description: toOptionalString(values.description),
    target_date: values.targetDate,
    status: values.status,
  };
};

export const toMilestoneUpdate = (
  values: MilestoneFormValues,
  version: number,
): MilestoneUpdate => {
  return {
    version,
    title: values.title.trim(),
    description: toOptionalString(values.description),
    target_date: values.targetDate,
    status: values.status,
  };
};

const toOptionalString = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue || null;
};
