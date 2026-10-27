import { notFound } from "next/navigation";
import { SystemTenantDetailPage } from "@/features/system-management/components/system-tenant-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const id = Number(tenantId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <SystemTenantDetailPage key={id} tenantId={id} />;
}
