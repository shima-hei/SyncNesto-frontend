"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { safeListReturn } from "@/lib/navigation/list-return";
import { cn } from "@/lib/utils";

import { useBreadcrumbLabels } from "../../hooks/use-breadcrumb-labels";
import { getBreadcrumbItems } from "../../utils/breadcrumbs";

export function SiteBreadcrumbs() {
  const pathname = usePathname();
  const returnTo = useSearchParams().get("returnTo");
  const items = getBreadcrumbItems(pathname);
  const labels = useBreadcrumbLabels(items);

  return (
    <Breadcrumb aria-label="パンくずリスト" className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = labels[index];

          return (
            <Fragment key={`${item.href ?? item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator className="shrink-0" /> : null}
              <BreadcrumbItem
                className={cn(
                  "min-w-0",
                  isLast ? "flex-[2_1_8rem]" : "max-w-24 md:max-w-60",
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
