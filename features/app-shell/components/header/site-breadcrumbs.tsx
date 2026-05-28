"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/features/projects/hooks/use-project";

import {
  getBreadcrumbItems,
  getProjectIdFromBreadcrumbItems,
} from "../../utils/breadcrumbs";

export function SiteBreadcrumbs() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);
  const projectId = getProjectIdFromBreadcrumbItems(items);
  const { project, isLoading } = useProject(projectId ?? 0);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label =
            item.dynamicType === "project" && project ? project.name : item.label;

          return (
            <Fragment key={`${item.href ?? item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLoading && item.dynamicType === "project" ? (
                  <Skeleton className="h-5 w-32" />
                ) : isLast || !item.href ? (
                  <BreadcrumbPage className="max-w-48 truncate md:max-w-72">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className="max-w-40 truncate md:max-w-60"
                  >
                    <Link href={item.href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
