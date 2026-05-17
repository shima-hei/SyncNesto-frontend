export type AccountProfileFormValues = {
  name: string;
  password: string;
};

export type AccountProfileFormErrors = Partial<
  Record<keyof AccountProfileFormValues, string>
>;

