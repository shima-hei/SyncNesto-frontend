export type RequirementSectionFormValues = {
  title: string;
  sectionType: string;
  content: string;
  sortOrder: string;
  status: string;
};

export type RequirementSectionFormErrors = Partial<
  Record<keyof RequirementSectionFormValues, string>
>;
