"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CommandIcon, MenuIcon, SettingsIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { TenantSwitcher } from "@/features/tenants/components/tenant-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  mainNavigation,
  managementNavigation,
} from "../../constants/navigation";
import {
  getVisibleNavigationItems,
  isNavigationItemActive,
} from "../../utils/navigation";
import { AppNavigationLink } from "../navigation/app-navigation-link";

type Scope = "system" | "organization";
type Props = { scope: Scope; canManageTenant?: boolean };

const railControl =
  "flex h-auto min-h-12 w-full flex-col gap-1 px-0.5 py-1.5 text-[0.625rem] leading-tight md:min-h-14 [&_svg]:size-5";
const mobileControl =
  "flex h-11 w-full justify-start gap-3 px-3 text-sm [&_svg]:size-5";

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function AppSidebar(props: Props) {
  return (
    <aside className="sticky top-0 hidden h-svh w-16 shrink-0 overflow-y-auto border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col md:px-1.5 lg:w-[4.5rem]">
      <AppNavigationLink
        href={props.scope === "system" ? "/system" : "/"}
        className="flex h-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CommandIcon className="size-5" aria-hidden />
        <span className="text-[0.625rem] font-semibold">Syncnesto</span>
      </AppNavigationLink>
      <NavigationLinks {...props} />
    </aside>
  );
}

export function MobileAppNavigation(props: Props) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <Sheet open={open && isMobile} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 md:hidden"
          aria-label="共通メニューを開く"
        >
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-64 max-w-[85vw] flex-col gap-2 p-2"
      >
        <SheetHeader className="flex flex-row items-center justify-between px-3 py-2">
          <SheetTitle>共通メニュー</SheetTitle>
          <SheetDescription className="sr-only">
            アプリ全体の画面へ移動します。
          </SheetDescription>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="共通メニューを閉じる"
            >
              <XIcon aria-hidden />
            </Button>
          </SheetClose>
        </SheetHeader>
        <NavigationLinks {...props} mobile onSelect={() => setOpen(false)} />
        {props.scope === "organization" && (
          <div className="px-3 pb-2 sm:hidden">
            <TenantSwitcher />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NavigationLinks({
  scope,
  canManageTenant = false,
  mobile = false,
  onSelect,
}: Props & { mobile?: boolean; onSelect?: () => void }) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const { user } = useAuth();
  const items = getVisibleNavigationItems(
    scope === "system" ? managementNavigation : mainNavigation,
    user,
  );
  const control = mobile ? mobileControl : railControl;
  const settingActive = [
    "/account",
    "/organization",
    "/projects/management",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <nav
      aria-label="アプリ共通ナビゲーション"
      className="flex min-h-0 flex-1 flex-col gap-1 py-2"
    >
      {items.map(({ href, title, icon: Icon }) => {
        if (!href) return null;
        const isWork = pathname === "/" && hash === "#my-work";
        const active =
          href === "/#my-work"
            ? isWork
            : (href !== "/" || !isWork) &&
              (href === "/projects/joined"
                ? pathname.startsWith("/projects/joined")
                : isNavigationItemActive({ href }, pathname));
        const link = (
          <Button
            asChild
            variant="ghost"
            className={cn(
              control,
              active &&
                "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
            )}
          >
            <AppNavigationLink
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={onSelect}
              title={title}
            >
              <Icon aria-hidden />
              <span>{title}</span>
            </AppNavigationLink>
          </Button>
        );
        return mobile ? (
          <div key={href}>{link}</div>
        ) : (
          <Tooltip key={href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{title}</TooltipContent>
          </Tooltip>
        );
      })}
      {scope === "organization" && (
        <div className="mt-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  control,
                  settingActive &&
                    "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                )}
              >
                <SettingsIcon aria-hidden />
                設定
              </Button>
            </PopoverTrigger>
            <PopoverContent
              aria-label="設定"
              side={mobile ? "top" : "right"}
              align="end"
              className="flex w-48 flex-col gap-1 p-1"
            >
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <AppNavigationLink href="/account" onClick={onSelect}>
                  アカウント
                </AppNavigationLink>
              </Button>
              {canManageTenant && (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                  >
                    <AppNavigationLink href="/organization" onClick={onSelect}>
                      メンバー・組織設定
                    </AppNavigationLink>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                  >
                    <AppNavigationLink
                      href="/projects/management"
                      onClick={onSelect}
                    >
                      プロジェクト管理
                    </AppNavigationLink>
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </nav>
  );
}
