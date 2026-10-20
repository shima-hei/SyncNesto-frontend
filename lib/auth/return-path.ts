import { mcpReturnPath } from "@/features/mcp/lib/navigation";

export const isGuestInvitationPath = (value: string): boolean =>
  /^\/guest-invitations\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  );

export function loginReturnPath(value: unknown): string | undefined {
  const mcp = mcpReturnPath(value);
  if (mcp) return mcp;
  if (typeof value !== "string") return undefined;
  if (isGuestInvitationPath(value)) return value;
  return /^\/shared\/publications(?:\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/i.test(
    value,
  )
    ? value
    : undefined;
}
