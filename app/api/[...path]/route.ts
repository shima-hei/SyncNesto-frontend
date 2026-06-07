import { NextRequest, NextResponse } from "next/server";

import {
  validateCsrfToken,
  isCsrfProtectedMethod,
} from "@/lib/security/csrf";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

// BFFでは、フロントエンドから呼び出す想定のAPIグループだけを公開する。
const ALLOWED_PREFIXES = ["/auth", "/users", "/projects"];
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

const proxyRequest = async (request: NextRequest, context: RouteContext) => {
  const upstreamPath = await getUpstreamPath(context);

  if (!isAllowedPath(upstreamPath)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { message: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  if (!validateCsrfToken(request, upstreamPath)) {
    return NextResponse.json(
      { message: "Invalid CSRF token", code: "CSRF_TOKEN_INVALID" },
      { status: 403 }
    );
  }

  const upstreamUrl = getUpstreamUrl(upstreamPath, request.nextUrl.search);
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: getUpstreamRequestHeaders(request),
    body: await getRequestBody(request),
    cache: "no-store",
    redirect: "manual",
  });

  return createProxyResponse(upstreamResponse);
};

const getUpstreamPath = async (context: RouteContext) => {
  const { path } = await context.params;

  return `/${path.join("/")}`;
};

const isAllowedPath = (path: string) => {
  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

const isAllowedOrigin = (request: NextRequest) => {
  if (!isCsrfProtectedMethod(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");

  if (origin) {
    return origin === request.nextUrl.origin;
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return true;
  }

  return new URL(referer).origin === request.nextUrl.origin;
};

const getUpstreamUrl = (path: string, search: string) => {
  const url = new URL(path, API_BASE_URL);
  url.search = search;

  return url;
};

const getUpstreamRequestHeaders = (request: NextRequest) => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
      return;
    }

    if (lowerKey === "host" || lowerKey === "content-length") {
      return;
    }

    if (lowerKey === "cookie") {
      headers.set(key, value);
      return;
    }

    headers.set(key, value);
  });

  return headers;
};

const getRequestBody = async (request: NextRequest) => {
  if (!BODY_METHODS.has(request.method)) {
    return undefined;
  }

  return request.arrayBuffer();
};

const createProxyResponse = async (upstreamResponse: Response) => {
  const headers = getProxyResponseHeaders(upstreamResponse);
  const body = await getResponseBody(upstreamResponse);

  return new NextResponse(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
};

const getProxyResponseHeaders = (upstreamResponse: Response) => {
  const headers = new Headers();

  upstreamResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
      return;
    }

    if (lowerKey === "content-encoding" || lowerKey === "content-length") {
      return;
    }

    if (lowerKey === "set-cookie") {
      return;
    }

    headers.append(key, value);
  });

  getSetCookieHeaders(upstreamResponse).forEach((cookie) => {
    headers.append("Set-Cookie", cookie);
  });

  return headers;
};

const getSetCookieHeaders = (upstreamResponse: Response) => {
  const headers = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookies = headers.getSetCookie?.();

  if (setCookies?.length) {
    return setCookies;
  }

  const setCookie = upstreamResponse.headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
};

const getResponseBody = async (upstreamResponse: Response) => {
  if ([101, 204, 205, 304].includes(upstreamResponse.status)) {
    return null;
  }

  return upstreamResponse.arrayBuffer();
};
