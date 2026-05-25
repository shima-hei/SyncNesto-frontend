export type RequirementReviewFormValues = {
  reviewerId: string;
  status: string;
  comment: string;
  reviewedAt: string;
};

export type RequirementReviewFormErrors = Partial<
  Record<keyof RequirementReviewFormValues, string>
>;
