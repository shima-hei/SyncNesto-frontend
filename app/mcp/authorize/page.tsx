import { notFound, redirect } from "next/navigation";
import { getCurrentUserOnServer } from "@/lib/auth/server";
import { McpConsent } from "@/features/mcp/components/mcp-consent";
import { mcpReturnPath } from "@/features/mcp/lib/navigation";

export const metadata = {
  title: "Codexとの接続 | Syncnesto",
  referrer: "no-referrer",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  if (process.env.MCP_ENABLED !== "true") notFound();
  const { request_id: requestId } = await searchParams;
  const returnPath = mcpReturnPath(`/mcp/authorize?request_id=${requestId}`);
  if (!requestId || !returnPath) notFound();
  const user = await getCurrentUserOnServer();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  if (user.password_change_required) redirect("/initial-password");
  if (user.demo)
    return (
      <main className="p-8">
        MCPへの接続には通常アカウントでログインしてください。
      </main>
    );
  return <McpConsent requestId={requestId} userName={user.name} />;
}
