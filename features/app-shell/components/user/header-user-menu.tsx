"use client";

import Link from "next/link";
import { CircleUserRoundIcon, LogOutIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/display/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SidebarScopeMenuItem } from "./sidebar-scope-menu-item";

export function HeaderUserMenu({
  scope,
}: {
  scope: "system" | "organization";
}) {
  const { user } = useAuth();
  const { logout, isPending } = useLogout();
  const name = user?.name ?? "ユーザー";
  const email = user?.email ?? "";

  const handleLogout = async () => {
    await logout().catch(() => undefined);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0"
          aria-label={`${name}のアカウントメニュー`}
        >
          <UserAvatar name={name} src={user?.avatar_url} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar name={name} src={user?.avatar_url} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              {email ? (
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <CircleUserRoundIcon />
              アカウント
            </Link>
          </DropdownMenuItem>
          <SidebarScopeMenuItem scope={scope} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={handleLogout}>
          <LogOutIcon />
          {isPending ? "ログアウト中..." : "ログアウト"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
