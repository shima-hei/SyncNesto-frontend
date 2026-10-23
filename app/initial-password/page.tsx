import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { InitialPasswordPage } from "@/features/auth/components/account-actions/initial-password-page";
import { loginReturnPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "初回パスワード設定",
  referrer: "no-referrer",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = loginReturnPath((await searchParams).next);
  const user = await requireUser({ allowInitialPassword: true, returnTo });
  if (!user.password_change_required) redirect(returnTo ?? "/");
  return (
    <InitialPasswordPage
      email={user.email}
      expiresAt={user.initial_password_expires_at}
      returnTo={returnTo}
    />
  );
}
