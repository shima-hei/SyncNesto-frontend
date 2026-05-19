export type ProjectMemberFormValues = {
  userId: string;
  roleKey: string;
};

export type ProjectMemberFormErrors = Partial<
  Record<keyof ProjectMemberFormValues, string>
>;
