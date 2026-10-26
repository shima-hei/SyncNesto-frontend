import "server-only";

import { isIP } from "node:net";
import { getVercelOidcTokenSync } from "@vercel/oidc";

const BFF_KEY_HEADER = "X-Syncnesto-BFF-Key";
const CLIENT_IP_HEADER = "X-Syncnesto-Client-IP";
const TRUSTED_OIDC_HEADER = "x-vercel-trusted-oidc-idp-token";

const reportPreviewAuthFailure = (reason: string) => {
  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.BACKEND_PREVIEW_OIDC_ENABLED === "true"
  ) {
    console.error("Backend Preview authentication unavailable", { reason });
  }
};

export const authenticateBackendRequest = (
  headers: Headers,
  incoming?: Headers,
) => {
  // ブラウザが送った内部用ヘッダーは必ず上書きする。
  headers.delete(BFF_KEY_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(TRUSTED_OIDC_HEADER);
  const secret = process.env.BFF_SHARED_SECRET;
  if (process.env.VERCEL === "1" && (!secret || secret.length < 32)) {
    reportPreviewAuthFailure("BFF_SHARED_SECRET_MISSING_OR_SHORT");
    throw new Error("BFF_SHARED_SECRET is required on Vercel");
  }
  if (secret) {
    headers.set(BFF_KEY_HEADER, secret);
  }
  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.BACKEND_PREVIEW_OIDC_ENABLED === "true"
  ) {
    let backend: URL;
    try {
      backend = new URL(process.env.API_BASE_URL ?? "");
    } catch {
      reportPreviewAuthFailure("BACKEND_ORIGIN_INVALID");
      throw new Error("Preview backend requires a Vercel HTTPS origin");
    }
    if (
      backend.protocol !== "https:" ||
      !backend.hostname.endsWith(".vercel.app") ||
      backend.username ||
      backend.password
    ) {
      reportPreviewAuthFailure("BACKEND_ORIGIN_INVALID");
      throw new Error("Preview backend requires a Vercel HTTPS origin");
    }
    let token: string;
    try {
      token = getVercelOidcTokenSync();
    } catch (error) {
      const qaToken = process.env.BACKEND_PREVIEW_OIDC_TOKEN;
      if (!qaToken) {
        reportPreviewAuthFailure("OIDC_TOKEN_UNAVAILABLE");
        throw error;
      }
      token = qaToken;
    }
    headers.set(TRUSTED_OIDC_HEADER, token);
  }
  // Vercelが上書きするヘッダーだけをIP制限の識別に使う。
  if (process.env.VERCEL === "1") {
    const clientIp = incoming?.get("x-vercel-forwarded-for")?.trim();
    if (clientIp && isIP(clientIp)) {
      headers.set(CLIENT_IP_HEADER, clientIp);
    }
  }
  return headers;
};
