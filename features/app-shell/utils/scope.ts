import type { CurrentUserRead } from "@/lib/api/generated/model";
import { isSystemAdmin } from "@/features/auth/utils/authorization";

export const isSystemPath = (pathname: string) =>
  pathname === "/system" || pathname.startsWith("/system/");

export const getAuthenticatedHome = (user: CurrentUserRead) =>
  isSystemAdmin(user) ? "/system" : "/";
