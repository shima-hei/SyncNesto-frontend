export type ProjectMemberFormValues = {
  userId: number | null;
  roleKey: string;
};

export type ProjectMemberFormErrors = Partial<
  Record<keyof ProjectMemberFormValues, string>
>;
