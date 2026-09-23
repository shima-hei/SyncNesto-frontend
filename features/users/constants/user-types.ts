import {
  USER_TYPE_KEYS,
  type UserTypeKey,
} from "@/features/auth/constants/roles";

export const USER_TYPE_OPTIONS = [
  {
    value: USER_TYPE_KEYS.internal,
    label: "社内",
  },
  {
    value: USER_TYPE_KEYS.guest,
    label: "ゲスト",
  },
] as const satisfies readonly { value: UserTypeKey; label: string }[];

export const getUserTypeLabel = (userType?: string | null) => {
  return (
    USER_TYPE_OPTIONS.find((option) => option.value === userType)?.label ??
    userType ??
    "-"
  );
};
