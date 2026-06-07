import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "access_token";

export const CSRF_COOKIE_NAME =
  process.env.CSRF_COOKIE_NAME ?? "csrf_token";
export const CSRF_HEADER_NAME =
  process.env.CSRF_HEADER_NAME ?? "X-CSRF-Token";

export const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const isCsrfProtectedMethod = (method: string) => {
  return CSRF_METHODS.has(method.toUpperCase());
};

export const shouldValidateCsrfToken = (request: NextRequest, path: string) => {
  if (!isCsrfProtectedMethod(request.method)) {
    return false;
  }

  if (path === "/auth/login") {
    return false;
  }

  // 認証Cookieがない場合は、CSRFではなく通常の未認証エラーとしてバックエンドに判定させる。
  return request.cookies.has(AUTH_COOKIE_NAME);
};

export const validateCsrfToken = (request: NextRequest, path: string) => {
  if (!shouldValidateCsrfToken(request, path)) {
    return true;
  }

  // Double Submit Cookie方式: 認証済み更新リクエストだけCookieとヘッダーの一致を確認する。
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
};
