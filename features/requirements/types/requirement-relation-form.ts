export type RequirementRelationFormValues = {
  targetType: string;
  targetId: string;
  relationType: string;
  description: string;
};

export type RequirementRelationFormErrors = Partial<
  Record<keyof RequirementRelationFormValues, string>
>;
