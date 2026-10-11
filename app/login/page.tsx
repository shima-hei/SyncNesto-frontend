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
    <>
      {(reason === "mfa-required" || reason === "mfa-expired") && (
        <p role="status" className="bg-muted px-4 pt-4 text-center text-sm">
          追加認証を開始するため、ログインしてください。有効期限が切れた場合も、ここからやり直せます。
        </p>
      )}
      <LoginPage
        returnTo={returnTo}
        showSessionExpiredToast={showSessionExpiredToast}
        demoEnabled={["1", "true", "yes", "on"].includes(
          process.env.DEMO_MODE?.toLowerCase() ?? "",
        )}
      />
    </>
  );
}
