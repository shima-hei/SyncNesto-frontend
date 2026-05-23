export type RequirementDocumentFormValues = {
  title: string;
  documentCode: string;
  status: string;
  purpose: string;
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
