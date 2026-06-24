export type MilestoneFormValues = {
  title: string;
  description: string;
  targetDate: string;
  status: string;
};

export type MilestoneFormErrors = Partial<
  Record<keyof MilestoneFormValues, string>
>;
