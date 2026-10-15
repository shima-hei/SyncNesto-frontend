import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemAdmin();
  return children;
}
