import "server-only";

import { isIP } from "node:net";

const BFF_KEY_HEADER = "X-Syncnesto-BFF-Key";
const CLIENT_IP_HEADER = "X-Syncnesto-Client-IP";

export const authenticateBackendRequest = (
  headers: Headers,
  incoming?: Headers,
) => {
  // ブラウザが送った内部用ヘッダーは必ず上書きする。
  headers.delete(BFF_KEY_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  const secret = process.env.BFF_SHARED_SECRET;
  if (process.env.VERCEL === "1" && (!secret || secret.length < 32)) {
    throw new Error("BFF_SHARED_SECRET is required on Vercel");
  }
  if (secret) {
    headers.set(BFF_KEY_HEADER, secret);
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
