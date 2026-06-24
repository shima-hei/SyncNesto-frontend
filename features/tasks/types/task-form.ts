export type TaskFormValues = {
  taskCode: string;
  title: string;
  description: string;
  taskType: string;
  status: string;
  priority: string;
  assigneeId: string;
  reporterId: string;
  startDate: string;
  dueDate: string;
  actualStartDate: string;
  actualEndDate: string;
  progressPercent: string;
  estimatedMinutes: string;
  actualMinutes: string;
  parentTaskId: string;
  requirementId: string;
  relationType: string;
  tags: string;
  sortOrder: string;
  changeReason: string;
};

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;
