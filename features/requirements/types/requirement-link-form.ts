export type RequirementLinkFormValues = {
  linkedType: string;
  linkedId: string;
};

export type RequirementLinkFormErrors = Partial<
  Record<keyof RequirementLinkFormValues, string>
>;
