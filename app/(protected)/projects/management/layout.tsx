import { TenantAdminGuard } from "@/features/tenants/providers/tenant-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TenantAdminGuard>{children}</TenantAdminGuard>;
}
