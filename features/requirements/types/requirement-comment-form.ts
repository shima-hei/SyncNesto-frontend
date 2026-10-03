import type { Mention } from "@/lib/comments/mentions";

export type RequirementCommentFormValues = {
  mentions?: Mention[];
  comment: string;
};

export type RequirementCommentFormErrors = Partial<
  Record<keyof RequirementCommentFormValues, string>
>;
