import "server-only";

import { isIP } from "node:net";
import { getVercelOidcTokenSync } from "@vercel/oidc";

const BFF_KEY_HEADER = "X-Syncnesto-BFF-Key";
const CLIENT_IP_HEADER = "X-Syncnesto-Client-IP";
const TRUSTED_OIDC_HEADER = "x-vercel-trusted-oidc-idp-token";

export const authenticateBackendRequest = (
  headers: Headers,
  incoming?: Headers,
) => {
  const requestOidcToken = incoming?.get("x-vercel-oidc-token");
  // ブラウザが送った内部用ヘッダーは必ず上書きする。
  headers.delete(BFF_KEY_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(TRUSTED_OIDC_HEADER);
  headers.delete("x-vercel-oidc-token");
  const secret = process.env.BFF_SHARED_SECRET;
  if (process.env.VERCEL === "1" && (!secret || secret.length < 32)) {
    throw new Error("BFF_SHARED_SECRET is required on Vercel");
  }
  if (secret) {
    headers.set(BFF_KEY_HEADER, secret);
  }
  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.BACKEND_PREVIEW_OIDC_ENABLED === "true"
  ) {
    const backend = new URL(process.env.API_BASE_URL ?? "");
    if (
      backend.protocol !== "https:" ||
      !backend.hostname.endsWith(".vercel.app") ||
      backend.username ||
      backend.password
    ) {
      throw new Error("Preview backend requires a Vercel HTTPS origin");
    }
    let token: string;
    try {
      token = getVercelOidcTokenSync();
    } catch (error) {
      // SDKのcontextがない実行形態では、VercelがRequestへ注入するtokenを使う。
      // 接続先のTrusted Sourcesが署名と呼出元・環境を検証する。
      if (process.env.VERCEL !== "1" || !requestOidcToken) throw error;
      token = requestOidcToken;
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
