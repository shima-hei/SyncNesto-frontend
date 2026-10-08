import type { Metadata } from "next";
import { ResetPasswordPage } from "@/features/auth/components/account-actions/reset-password-page";

export const metadata: Metadata = { referrer: "no-referrer" };

export default function Page() {
  return <ResetPasswordPage />;
}
