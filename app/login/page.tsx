import { LoginPage } from "@/features/auth/components/login/login-page";
import { redirectIfAuthenticated } from "@/lib/auth/server";

type PageProps = {
  searchParams: Promise<{
    reason?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await redirectIfAuthenticated();

  const { reason } = await searchParams;
  const showSessionExpiredToast = reason === "session-expired";

  return <LoginPage showSessionExpiredToast={showSessionExpiredToast} />;
}
