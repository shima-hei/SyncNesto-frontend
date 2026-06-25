export type TaskCommentFormValues = {
  body: string;
  status: string;
};

export type TaskCommentFormErrors = Partial<Record<keyof TaskCommentFormValues, string>>;
