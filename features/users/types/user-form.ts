import type { UserTypeKey } from "@/features/auth/constants/roles";

export type UserFormValues = {
  email: string;
  name: string;
  password: string;
  department: string;
  position: string;
  userType: UserTypeKey;
  isActive: boolean;
  isSystemAdmin: boolean;
};

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;
