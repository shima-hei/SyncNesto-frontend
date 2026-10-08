import { LoginPage } from "@/features/auth/components/login/login-page";
import { redirectIfAuthenticated } from "@/lib/auth/server";
import { mcpReturnPath } from "@/features/mcp/lib/navigation";

type PageProps = {
  searchParams: Promise<{
    reason?: string | string[];
    next?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { reason, next } = await searchParams;
  const returnTo = mcpReturnPath(next);
  await redirectIfAuthenticated(returnTo);
  const showSessionExpiredToast = reason === "session-expired";

  return (
    <LoginPage
      returnTo={returnTo}
      showSessionExpiredToast={showSessionExpiredToast}
      demoEnabled={["1", "true", "yes", "on"].includes(
        process.env.DEMO_MODE?.toLowerCase() ?? "",
      )}
    />
  );
}
