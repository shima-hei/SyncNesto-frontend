"use client";

import { useIsMutating, useQuery } from "@tanstack/react-query";
import { Building2Icon, ShieldCheckIcon } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { isSystemAdmin } from "@/features/auth/utils/authorization";
import { listMyTenantsTenantsGet } from "@/lib/api/generated/tenants/tenants";

export function SidebarScopeMenuItem({
  scope,
}: {
  scope: "system" | "organization";
}) {
  const { user } = useAuth();
  const pending = useIsMutating();
  const admin = isSystemAdmin(user);
  const system = scope === "system";
  const choices = useQuery({
    queryKey: ["tenant-choices", user?.demo?.id ?? "normal", user?.id],
    queryFn: ({ signal }) => listMyTenantsTenantsGet({ signal }),
    enabled: admin && system,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  if (
    !admin ||
    (system &&
      (choices.isPending ||
        choices.isFetching ||
        choices.isError ||
        !choices.data?.length))
  )
    return null;

  return (
    <DropdownMenuItem
      disabled={pending > 0}
      onSelect={() => window.location.assign(system ? "/" : "/system")}
    >
      {system ? <Building2Icon /> : <ShieldCheckIcon />}
      {system ? "組織の業務画面へ" : "システム管理へ"}
    </DropdownMenuItem>
  );
}
