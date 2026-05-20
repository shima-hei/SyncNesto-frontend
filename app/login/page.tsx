import { LoginPage } from "@/features/auth/components/login/login-page";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export default async function Page() {
  await redirectIfAuthenticated();

  return <LoginPage />;
}
