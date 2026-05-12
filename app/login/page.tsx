import { GuestGuard } from "@/features/auth/components/auth-guard";
import { LoginPage } from "@/features/auth/components/login-page";

export default function Page() {
  return (
    <GuestGuard>
      <LoginPage />
    </GuestGuard>
  );
}
