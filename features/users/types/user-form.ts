export type UserFormValues = {
  email: string;
  name: string;
  password: string;
  department: string;
  position: string;
  isActive: boolean;
  isSystemAdmin: boolean;
};

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;
