import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isSystemAdmin } from "@/features/auth/utils/authorization";
import type { CurrentUserRead } from "@/lib/api/generated/model";
import { AUTH_ERROR_CODES } from "@/lib/auth/session-events";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "access_token";
const LOGIN_PATH = "/login";
const SESSION_EXPIRED_LOGIN_PATH = `${LOGIN_PATH}?reason=session-expired`;

type AuthErrorResponse = {
  code?: string;
};

type CurrentUserResult =
  | {
      user: CurrentUserRead;
      failureReason: null;
    }
  | {
      user: null;
      failureReason: "unauthenticated" | "session-expired";
    };

export const getCurrentUserOnServer = async () => {
  const result = await getCurrentUserResultOnServer();

  return result.user;
};

const getCurrentUserResultOnServer = async (): Promise<CurrentUserResult> => {
  const cookieStore = await cookies();

  if (!cookieStore.has(AUTH_COOKIE_NAME)) {
    return {
      user: null,
      failureReason: "unauthenticated",
    };
  }

  const response = await fetchCurrentUser(cookieStore.toString());

  if (!response.ok) {
    const errorCode = await getAuthErrorCode(response);

    return {
      user: null,
      failureReason: isSessionExpiredCode(errorCode)
        ? "session-expired"
        : "unauthenticated",
    };
  }

  return {
    user: (await response.json()) as CurrentUserRead,
    failureReason: null,
  };
};

const fetchCurrentUser = async (cookieHeader: string) => {
  try {
    return await fetch(new URL("/auth/me", API_BASE_URL), {
      headers: {
        // Server GuardはFastAPIを直接呼ぶため、ブラウザから受け取ったCookieを手動で転送する。
        Cookie: cookieHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    // バックエンド未起動やネットワーク断では認証なし扱いにし、Next.jsの画面全体を落とさない。
    return new Response(null, { status: 503 });
  }
};

const getAuthErrorCode = async (response: Response) => {
  try {
    const data = (await response.json()) as AuthErrorResponse;

    return data.code;
  } catch {
    return undefined;
  }
};

const isSessionExpiredCode = (code: string | undefined) => {
  return (
    code === AUTH_ERROR_CODES.tokenExpired ||
    code === AUTH_ERROR_CODES.invalidToken ||
    code === AUTH_ERROR_CODES.authenticationRequired
  );
};

export const requireUser = async () => {
  const result = await getCurrentUserResultOnServer();

  if (!result.user) {
    redirect(
      result.failureReason === "session-expired"
        ? SESSION_EXPIRED_LOGIN_PATH
        : LOGIN_PATH
    );
  }

  return result.user;
};

export const requireSystemAdmin = async () => {
  const user = await requireUser();

  if (!isSystemAdmin(user)) {
    redirect("/forbidden");
  }

  return user;
};

export const redirectIfAuthenticated = async (redirectTo = "/") => {
  const user = await getCurrentUserOnServer();

  if (user) {
    redirect(redirectTo);
  }
};
