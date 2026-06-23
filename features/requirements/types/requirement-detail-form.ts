export type RequirementDetailFormValues = {
  detailType: string;
  detailJson: string;
};

export type RequirementDetailFormErrors = Partial<
  Record<keyof RequirementDetailFormValues, string>
>;
