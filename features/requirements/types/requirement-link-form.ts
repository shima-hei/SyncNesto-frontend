export type RequirementLinkFormValues = {
  linkedType: string;
  linkedId: string;
  linkedUrl: string;
  status: string;
};

export type RequirementLinkFormErrors = Partial<
  Record<keyof RequirementLinkFormValues, string>
>;
