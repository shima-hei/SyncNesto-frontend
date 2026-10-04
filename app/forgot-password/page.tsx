import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/auth/components/account-actions/forgot-password-page";

export const metadata: Metadata = { referrer: "no-referrer" };

export default function Page() {
  return <ForgotPasswordPage />;
}
