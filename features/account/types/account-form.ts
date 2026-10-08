export type AccountProfileFormValues = {
  name: string;
};

export type AccountProfileFormErrors = Partial<
  Record<keyof AccountProfileFormValues, string>
>;
