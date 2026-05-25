export type RequirementCommentFormValues = {
  comment: string;
};

export type RequirementCommentFormErrors = Partial<
  Record<keyof RequirementCommentFormValues, string>
>;
