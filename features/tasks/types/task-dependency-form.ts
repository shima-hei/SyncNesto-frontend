export type TaskDependencyFormValues = {
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: string;
};

export type TaskDependencyFormErrors = Partial<
  Record<keyof TaskDependencyFormValues, string>
>;
