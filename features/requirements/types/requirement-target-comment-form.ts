export type RequirementTargetCommentFormValues = {
  body: string;
  targetAnchor: string;
  reason: string;
};

export type RequirementTargetCommentFormErrors = Partial<
  Record<keyof RequirementTargetCommentFormValues, string>
>;
