import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ProtectedShell } from "@/features/app-shell/components/protected-shell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProtectedShell>{children}</ProtectedShell>
    </AuthGuard>
  );
}
