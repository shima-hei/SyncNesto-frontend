import type { Mention } from "@/lib/comments/mentions";

export type TaskCommentFormValues = {
  mentions?: Mention[];
  body: string;
  status: string;
};

export type TaskCommentFormErrors = Partial<
  Record<keyof TaskCommentFormValues, string>
>;
