import { ApiError } from "./error";
import type { ApiErrorResponse, ApiValidationErrorResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string;

type ApiClientOptions = Omit<RequestInit, "body" | "method"> & {
  method: HttpMethod;
  params?: Record<string, unknown>;
  body?: BodyInit | null;
};

export type ErrorType<Error> = ApiError & { data: Error };
export type BodyType<BodyData> = BodyData;

export async function apiClient<T>(
  url: string,
  options: ApiClientOptions
): Promise<T> {
  const { method, params, body, headers, signal } = options;
  const requestUrl = buildUrl(url, params);
  const response = await fetch(requestUrl, {
    method,
    credentials: "include",
    headers: buildHeaders(headers, body),
    body: getRequestBody(body),
    signal,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: getErrorMessage(data),
      code: getErrorCode(data),
      data,
    });
  }

  return data as T;
}

const buildUrl = (path: string, params?: Record<string, unknown>) => {
  const url = isAbsoluteUrl(API_BASE_URL)
    ? new URL(path, API_BASE_URL)
    : new URL(
        `${normalizeBasePath(API_BASE_URL)}${normalizePath(path)}`,
        "http://bff.local"
      );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  if (isAbsoluteUrl(API_BASE_URL)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
};

const isAbsoluteUrl = (url: string) => {
  return /^https?:\/\//.test(url);
};

const normalizeBasePath = (basePath: string) => {
  if (!basePath || basePath === "/") {
    return "";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

const normalizePath = (path: string) => {
  return path.startsWith("/") ? path : `/${path}`;
};

const buildHeaders = (headers: HeadersInit | undefined, body: unknown) => {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return requestHeaders;
};

const getRequestBody = (body: unknown) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
};

const parseResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return JSON.parse(text);
  }

  return text;
};

const getErrorMessage = (data: unknown) => {
  if (isApiErrorResponse(data)) {
    return data.message;
  }

  if (isApiValidationErrorResponse(data)) {
    return data.detail?.[0]?.msg ?? "入力内容を確認してください。";
  }

  return "APIリクエストに失敗しました。";
};

const getErrorCode = (data: unknown) => {
  if (isApiErrorResponse(data)) {
    return data.code;
  }

  return undefined;
};

const isApiErrorResponse = (data: unknown): data is ApiErrorResponse => {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string" &&
    "code" in data &&
    typeof data.code === "string"
  );
};

const isApiValidationErrorResponse = (
  data: unknown
): data is ApiValidationErrorResponse => {
  return (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray(data.detail)
  );
};
