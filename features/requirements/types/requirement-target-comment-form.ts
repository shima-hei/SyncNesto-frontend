import type { Mention } from "@/lib/comments/mentions";

export type RequirementTargetCommentFormValues = {
  mentions?: Mention[];
  body: string;
  targetAnchor: string;
  reason: string;
};

export type RequirementTargetCommentFormErrors = Partial<
  Record<keyof RequirementTargetCommentFormValues, string>
>;
