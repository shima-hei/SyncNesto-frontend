import type { Mention } from "@/lib/comments/mentions";

export type TaskCommentFormValues = {
  mentions?: Mention[];
  imageIds?: string[];
  body: string;
  status: string;
};

export type TaskCommentFormErrors = Partial<
  Record<keyof TaskCommentFormValues, string>
>;
