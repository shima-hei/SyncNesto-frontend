import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { CurrentUserRead } from "@/lib/api/generated/model";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "access_token";

export const getCurrentUserOnServer = async () => {
  const cookieStore = await cookies();

  if (!cookieStore.has(AUTH_COOKIE_NAME)) {
    return null;
  }

  const response = await fetch(new URL("/auth/me", API_BASE_URL), {
    headers: {
      Cookie: cookieStore.toString(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CurrentUserRead;
};

export const requireUser = async () => {
  const user = await getCurrentUserOnServer();

  if (!user) {
    redirect("/login");
  }

  return user;
};

export const redirectIfAuthenticated = async (redirectTo = "/") => {
  const user = await getCurrentUserOnServer();

  if (user) {
    redirect(redirectTo);
  }
};
