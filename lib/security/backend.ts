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
  // ブラウザが送った内部用ヘッダーは必ず上書きする。
  headers.delete(BFF_KEY_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(TRUSTED_OIDC_HEADER);
  headers.delete("x-vercel-protection-bypass");
  const secret = process.env.BFF_SHARED_SECRET;
  if (process.env.VERCEL === "1" && (!secret || secret.length < 32)) {
    throw new Error("BFF_SHARED_SECRET is required on Vercel");
  }
  if (secret) {
    headers.set(BFF_KEY_HEADER, secret);
  }
  const preview = process.env.VERCEL_ENV === "preview";
  const oidc = preview && process.env.BACKEND_PREVIEW_OIDC_ENABLED === "true";
  const previewCookie = preview
    ? process.env.BACKEND_PREVIEW_VERCEL_AUTH_COOKIE
    : undefined;
  if (oidc || previewCookie) {
    const backend = new URL(process.env.API_BASE_URL ?? "");
    if (
      backend.protocol !== "https:" ||
      !backend.hostname.endsWith(".vercel.app") ||
      backend.username ||
      backend.password
    ) {
      throw new Error("Preview backend requires a Vercel HTTPS origin");
    }
    if (oidc) headers.set(TRUSTED_OIDC_HEADER, getVercelOidcTokenSync());
    if (previewCookie) {
      const claims = JSON.parse(
        Buffer.from(previewCookie.split(".")[1] ?? "", "base64url").toString(),
      ) as { aud?: string; exp?: number };
      if (
        process.env.BACKEND_PREVIEW_PROTECTED_ORIGIN !== backend.origin ||
        claims.aud !== backend.hostname ||
        typeof claims.exp !== "number" ||
        claims.exp <= Date.now() / 1000 ||
        /[;\s]/.test(previewCookie)
      ) {
        throw new Error("Preview access credential expired or mismatched");
      }
      const cookies = (headers.get("Cookie") ?? "")
        .split(";")
        .map((cookie) => cookie.trim())
        .filter((cookie) => cookie && !cookie.startsWith("_vercel_jwt="));
      cookies.push(`_vercel_jwt=${previewCookie}`);
      headers.set("Cookie", cookies.join("; "));
    }
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
