"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  TenantProvider,
  useTenant,
} from "@/features/tenants/providers/tenant-provider";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "../header/site-header";
import { DemoBanner } from "@/features/auth/components/shared/demo-banner";

export function ProtectedShell({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <ScopedShell>{children}</ScopedShell>
    </TenantProvider>
  );
}

function ScopedShell({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const pathname = usePathname();
  const tenantIndependent =
    pathname.startsWith("/system/") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/help");
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
      >
        本文へ移動
      </a>
      <AppSidebar variant="inset" />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <DemoBanner />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {tenant || tenantIndependent ? (
              children
            ) : (
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-semibold">
                  所属する組織がありません
                </h1>
                <p>組織管理者に所属の追加を依頼してください。</p>
                <Link href="/system/tenants">運営者の組織管理</Link>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
