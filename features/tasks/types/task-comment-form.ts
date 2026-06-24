export type TaskCommentFormValues = {
  body: string;
};

export type TaskCommentFormErrors = Partial<Record<keyof TaskCommentFormValues, string>>;
