export type RequirementOpenIssueFormValues = {
  issueCode: string;
  title: string;
  description: string;
  impactScope: string;
  relatedRequirementId: string;
  assigneeId: string;
  dueDate: string;
  status: string;
  resolution: string;
  blocksApproval: boolean;
  reason: string;
};

export type RequirementOpenIssueFormErrors = Partial<
  Record<keyof RequirementOpenIssueFormValues, string>
>;
