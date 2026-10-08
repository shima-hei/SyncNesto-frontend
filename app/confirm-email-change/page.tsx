import type { Metadata } from "next";
import { ConfirmEmailChangePage } from "@/features/auth/components/account-actions/confirm-email-change-page";

export const metadata: Metadata = { referrer: "no-referrer" };

export default function Page() {
  return <ConfirmEmailChangePage />;
}
