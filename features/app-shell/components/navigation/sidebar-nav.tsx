"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { AppNavigationItem } from "../../constants/navigation";
import { isNavigationItemActive } from "../../utils/navigation";

export function SidebarNav({
  items,
  pathname,
  className,
}: {
  items: AppNavigationItem[];
  pathname: string;
  className?: string;
}) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const itemKey = item.href ?? item.title;
            const isOpen = Boolean(openItems[itemKey]);
            const isActive =
              isNavigationItemActive(item, pathname) ||
              Boolean(
                item.children?.some((child) =>
                  isNavigationItemActive(child, pathname)
                )
              );
            const Icon = item.icon;

            if (item.children?.length) {
              return (
                <SidebarMenuItem key={itemKey}>
                  <SidebarMenuButton
                    type="button"
                    isActive={isActive}
                    aria-expanded={isOpen}
                    onClick={() => toggleItem(itemKey)}
                  >
                    <Icon />
                    <span>{item.title}</span>
                    <ChevronRightIcon
                      aria-hidden="true"
                      className={cn(
                        "ml-auto transition-transform",
                        isOpen && "rotate-90"
                      )}
                    />
                  </SidebarMenuButton>
                  {isOpen ? (
                    <SidebarMenuSub>
                      {item.children.map((child) => {
                        const isChildActive = isNavigationItemActive(
                          child,
                          pathname
                        );
                        const ChildIcon = child.icon;

                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isChildActive}
                            >
                              <Link
                                href={child.href}
                                className={cn(isChildActive && "font-medium")}
                              >
                                {ChildIcon ? <ChildIcon /> : null}
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              );
            }

            if (!item.href) {
              return null;
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link
                    href={item.href}
                    className={cn(isActive && "font-medium")}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
