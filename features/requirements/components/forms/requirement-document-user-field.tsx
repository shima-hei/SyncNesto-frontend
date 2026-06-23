import type { UserSummary } from "@/lib/api/generated/model";

import { RequirementUserSelectField } from "./requirement-user-select-field";

export type RequirementDocumentUserValues = {
  author?: UserSummary | null;
  reviewer?: UserSummary | null;
  approver?: UserSummary | null;
};

type RequirementDocumentUserFieldProps = {
  projectId: number;
  label: string;
  value: string;
  initialUser?: UserSummary | null;
  onChange: (value: string) => void;
};

export function RequirementDocumentUserField({
  projectId,
  label,
  value,
  initialUser,
  onChange,
}: RequirementDocumentUserFieldProps) {
  return (
    <RequirementUserSelectField
      projectId={projectId}
      label={label}
      value={value}
      initialUser={initialUser}
      onChange={onChange}
    />
  );
}
