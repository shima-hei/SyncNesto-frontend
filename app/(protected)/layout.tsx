import { ProtectedShell } from "@/features/app-shell/components/layout/protected-shell";
import { requireUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.guest_workspace_only) redirect("/shared");

  return <ProtectedShell>{children}</ProtectedShell>;
}
