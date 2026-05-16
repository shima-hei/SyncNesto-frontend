import { NextResponse } from "next/server";

import {
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getCsrfCookieOptions,
} from "@/lib/security/csrf";

export function GET() {
  const csrfToken = generateCsrfToken();
  const response = NextResponse.json({ csrfToken });

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

  return response;
}
