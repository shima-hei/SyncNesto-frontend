import type { NextRequest } from "next/server";

export const CSRF_COOKIE_NAME =
  process.env.CSRF_COOKIE_NAME ?? "csrf_token";
export const CSRF_HEADER_NAME =
  process.env.CSRF_HEADER_NAME ?? "X-CSRF-Token";

export const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const generateCsrfToken = () => {
  return crypto.randomUUID();
};

export const isCsrfProtectedMethod = (method: string) => {
  return CSRF_METHODS.has(method.toUpperCase());
};

export const validateCsrfToken = (request: NextRequest) => {
  if (!isCsrfProtectedMethod(request.method)) {
    return true;
  }

  // Double Submit Cookie方式: Cookieとヘッダーの値が一致するかを検証する。
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
};

export const getCsrfCookieOptions = () => {
  return {
    // APIクライアントがCSRFヘッダーへ設定するため、ブラウザから読めるCookieにする。
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  } as const;
};
