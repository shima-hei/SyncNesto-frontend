import { mcpReturnPath } from "@/features/mcp/lib/navigation";

export const LOGIN_RETURN_HEADER = "x-syncnesto-return-path";

const isProtectedPagePath = (value: string): boolean =>
  /^\/(?:projects\/(?:joined|management)(?:\/[A-Za-z0-9_-]+)*|system(?:\/[A-Za-z0-9_-]+)*|organization(?:\/audit-logs)?|account|notifications|search|entry|forbidden)?$/.test(
    value,
  );

export const isGuestInvitationPath = (value: string): boolean =>
  /^\/guest-invitations\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  );

export const isSharedApprovalPath = (value: string): boolean =>
  /^\/shared\/publications\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/approval-requests\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  );

export function loginReturnPath(value: unknown): string | undefined {
  const mcp = mcpReturnPath(value);
  if (mcp) return mcp;
  if (typeof value !== "string") return undefined;
  if (value === "/shared/notifications") return value;
  if (isGuestInvitationPath(value)) return value;
  if (isSharedApprovalPath(value)) return value;
  if (
    /^\/shared\/publications(?:\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/i.test(
      value,
    )
  )
    return value;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return undefined;
  const pathname = value.split(/[?#]/, 1)[0];
  return isProtectedPagePath(pathname) ? value : undefined;
}

export function withLoginReturnTo(path: string, value: unknown): string {
  const returnTo = loginReturnPath(value);
  return returnTo
    ? `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(returnTo)}`
    : path;
}

export function browserLoginReturnPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const { pathname, search, hash } = window.location;
  if (typeof pathname !== "string") return undefined;
  return loginReturnPath(`${pathname}${search ?? ""}${hash ?? ""}`);
}

export function loginReturnPathWithFragment(
  value: unknown,
  fragment: string,
): string | undefined {
  const returnTo = loginReturnPath(value);
  if (!returnTo || returnTo.includes("#") || !fragment.startsWith("#"))
    return returnTo;
  // HTTPのredirectでブラウザが引き継いだfragmentも通常画面だけに戻す。
  return loginReturnPath(returnTo + fragment) ?? returnTo;
}
