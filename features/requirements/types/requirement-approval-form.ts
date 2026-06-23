export type RequirementApprovalRequestFormValues = {
  approverId: string;
  comment: string;
};

export type RequirementApprovalRequestFormErrors = Partial<
  Record<keyof RequirementApprovalRequestFormValues, string>
>;
