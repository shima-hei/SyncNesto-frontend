import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { InitialPasswordPage } from "@/features/auth/components/account-actions/initial-password-page";

export const metadata: Metadata = {
  title: "初回パスワード設定",
  referrer: "no-referrer",
};

export default async function Page() {
  const user = await requireUser({ allowInitialPassword: true });
  if (!user.password_change_required) redirect("/");
  return (
    <InitialPasswordPage
      email={user.email}
      expiresAt={user.initial_password_expires_at}
    />
  );
}
