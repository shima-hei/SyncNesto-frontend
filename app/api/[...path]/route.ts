import { NextRequest, NextResponse } from "next/server";

import { authenticateBackendRequest } from "@/lib/security/backend";
import { validateCsrfToken, isCsrfProtectedMethod } from "@/lib/security/csrf";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

// BFFでは、フロントエンドから呼び出す想定のAPIグループだけを公開する。
const ALLOWED_PREFIXES = [
  "/notification-preferences",
  "/shared/notifications",
  "/shared/publications",
  "/guest-invitations",
  "/demo",
  "/auth",
  "/tenants",
  "/drafts",
  "/home",
  "/search",
  "/notifications",
  "/users",
  "/projects",
  "/tasks",
  "/task-comments",
  "/requirements",
  "/task-dependencies",
  "/boards",
  "/board-columns",
  "/milestones",
];
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
  const privatePublication =
    /^\/projects\/[^/]+\/(?:requirement-verification-plans|requirement-verification-requests|requirement-verdicts)(?:\/|$)/.test(
      upstreamPath,
    ) ||
    upstreamPath === "/notification-preferences" ||
    /^\/projects\/[^/]+\/requirement-agreements(?:\/|$)/.test(upstreamPath) ||
    /^\/projects\/[^/]+\/requirement-trace(?:\/|$)/.test(upstreamPath) ||
    /^\/projects\/[^/]+\/objectives(?:\/|$)/.test(upstreamPath) ||
    /^\/projects\/[^/]+\/fixed-approvals\/[^/]+\/next-actions$/.test(
      upstreamPath,
    ) ||
    upstreamPath === "/shared/notifications" ||
    upstreamPath.startsWith("/shared/notifications/") ||
    /^\/projects\/[^/]+\/(?:artifact-publications|guest-participations|guest-invitations|guest-fixed-approvals)(?:\/|$)/.test(
      upstreamPath,
    ) ||
    upstreamPath === "/shared/publications" ||
    upstreamPath.startsWith("/shared/publications/") ||
    upstreamPath.startsWith("/guest-invitations/");
  if (!privatePublication) return proxyUpstream(request, upstreamPath);
  let response: NextResponse;
  try {
    response = await proxyUpstream(request, upstreamPath);
  } catch {
    response = NextResponse.json(
      { message: "Service unavailable", code: "SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};

const proxyUpstream = async (request: NextRequest, upstreamPath: string) => {
  if (!isAllowedPath(upstreamPath)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (
    !isAllowedOrigin(request) ||
    (upstreamPath.startsWith("/demo/") &&
      BODY_METHODS.has(request.method) &&
      request.headers.get("origin") !== request.nextUrl.origin)
  ) {
    return NextResponse.json(
      { message: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (!validateCsrfToken(request, upstreamPath)) {
    return NextResponse.json(
      { message: "Invalid CSRF token", code: "CSRF_TOKEN_INVALID" },
      { status: 403 },
    );
  }

  const upstreamUrl = getUpstreamUrl(upstreamPath, request.nextUrl.search);
  let upstreamHeaders: Headers;
  try {
    upstreamHeaders = getUpstreamRequestHeaders(request);
    if (
      upstreamPath === "/notification-preferences" ||
      upstreamPath === "/shared/notifications" ||
      upstreamPath.startsWith("/shared/notifications/") ||
      upstreamPath.startsWith("/shared/publications") ||
      upstreamPath.startsWith("/guest-invitations/")
    ) {
      upstreamHeaders.delete("X-Tenant-ID");
    }
  } catch {
    return NextResponse.json(
      { message: "Service unavailable", code: "SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
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
  if (
    /^\/integrations\/mcp\/(?:availability|connections(?:\/[a-f0-9-]+)?|authorization-requests\/[a-f0-9-]+(?:\/(?:approve|deny))?)$/i.test(
      path,
    )
  )
    return true;
  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
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

  return authenticateBackendRequest(headers, request.headers);
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

    if (["x-syncnesto-bff-key", "x-syncnesto-client-ip"].includes(lowerKey)) {
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
