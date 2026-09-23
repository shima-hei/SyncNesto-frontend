export type RequirementDetailFormValues = {
  detailType: string;
  sourceDetailType?: string;
  fields: Record<string, string>;
  rawJson: string;
};

export type RequirementDetailFormErrors = Partial<
  Record<keyof RequirementDetailFormValues | `field.${string}`, string>
>;
