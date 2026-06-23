export type RequirementTargetCommentFormValues = {
  body: string;
  reason: string;
};

export type RequirementTargetCommentFormErrors = Partial<
  Record<keyof RequirementTargetCommentFormValues, string>
>;
