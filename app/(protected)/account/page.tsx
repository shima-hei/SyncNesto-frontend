import { AccountPage } from "@/features/account/components/pages/account-page";

export default function Page() {
  return <AccountPage mcpEnabled={process.env.MCP_ENABLED === "true"} />;
}
