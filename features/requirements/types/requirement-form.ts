export type RequirementFormValues = {
  requirementCode: string;
  requirementType: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  acceptanceCriteria: string;
  priority: string;
  status: string;
  source: string;
  ownerId: string;
  approvedBy: string;
  approvedAt: string;
  changeSummary: string;
  reason: string;
};

export type RequirementFormErrors = Partial<
  Record<keyof RequirementFormValues, string>
>;
