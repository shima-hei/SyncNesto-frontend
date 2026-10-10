import { AccountPage } from "@/features/account/components/pages/account-page";
import { mcpPluginInstallUrl } from "@/features/mcp/lib/navigation";

export default function Page() {
  return (
    <AccountPage
      mcpEnabled={process.env.MCP_ENABLED === "true"}
      mcpInstallUrl={mcpPluginInstallUrl(process.env.MCP_PLUGIN_INSTALL_URL)}
    />
  );
}
