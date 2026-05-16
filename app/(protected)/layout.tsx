import { ProtectedShell } from "@/features/app-shell/components/protected-shell";
import { requireUser } from "@/lib/auth/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return <ProtectedShell>{children}</ProtectedShell>;
}
