"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { safeListReturn } from "@/lib/navigation/list-return";
import { cn } from "@/lib/utils";

import { useBreadcrumbLabels } from "../../hooks/use-breadcrumb-labels";
import { getBreadcrumbItems } from "../../utils/breadcrumbs";

export function SiteBreadcrumbs() {
  const pathname = usePathname();
  const returnTo = useSearchParams().get("returnTo");
  const items = getBreadcrumbItems(pathname);
  const labels = useBreadcrumbLabels(items);
  const ancestors = items.flatMap((item, index) =>
    item.href
      ? [{ href: safeListReturn(returnTo, item.href), label: labels[index] }]
      : [],
  );

  return (
    <Breadcrumb
      aria-label="パンくずリスト"
      className="@container/breadcrumbs min-w-0"
    >
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        {ancestors.length > 0 && (
          <>
            <BreadcrumbItem className="shrink-0 @min-[16rem]/breadcrumbs:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="親ページを表示"
                  >
                    <BreadcrumbEllipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="max-w-64 break-all">
                    {labels.at(-1)}
                  </DropdownMenuLabel>
                  {ancestors.map(({ href, label }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="max-w-64 break-all">
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 @min-[16rem]/breadcrumbs:hidden" />
          </>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = labels[index];

          return (
            <Fragment key={`${item.href ?? item.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="hidden shrink-0 @min-[16rem]/breadcrumbs:block" />
              ) : null}
              <BreadcrumbItem
                className={cn(
                  "min-w-0",
                  isLast
                    ? "flex-[1_1_6rem] @min-[16rem]/breadcrumbs:min-w-20"
                    : "hidden max-w-24 @min-[16rem]/breadcrumbs:inline-flex md:max-w-60",
                )}
              >
                {isLast ? (
                  <BreadcrumbPage
                    className="truncate"
                    title={label}
                    role={undefined}
                    aria-disabled={undefined}
                  >
                    {label}
                  </BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink
                    asChild
                    className="truncate rounded-sm hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Link
                      href={safeListReturn(returnTo, item.href)}
                      title={label}
                    >
                      {label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="truncate" title={label}>
                    {label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
