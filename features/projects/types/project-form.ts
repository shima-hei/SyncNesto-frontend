export type ProjectFormValues = {
  projectCode: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  requirementReviewRequired: boolean;
};

export type ProjectFormErrors = Partial<
  Record<keyof ProjectFormValues, string>
>;
