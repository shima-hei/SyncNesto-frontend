import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/server";
import { headers } from "next/headers";
import { loginReturnPath } from "@/lib/auth/return-path";
import { SharedShell } from "@/features/artifact-publications/components/shared-pages";

export const metadata: Metadata = {
  title: "共有された内容",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = (await headers()).get("x-syncnesto-pathname");
  await requireUser({
    returnTo: loginReturnPath(path) ?? "/shared/publications",
  });
  return <SharedShell>{children}</SharedShell>;
}
