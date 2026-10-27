export type RequirementDocumentFormValues = {
  standardChapters?: boolean;
  title: string;
  documentCode: string;
  status: string;
  purpose: string;
  projectGoal?: string;
  projectScope?: string;
  projectCompletionCriteria?: string;
  targetSystemName: string;
  clientName: string;
  vendorName: string;
  authorId: string;
  reviewerId: string;
  approverId: string;
  approvedAt: string;
};

export type RequirementDocumentFormErrors = Partial<
  Record<keyof RequirementDocumentFormValues, string>
>;
