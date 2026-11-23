"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function useCurrentRoute() {
  const pathname = usePathname();
  const params = useSearchParams();
  return `${pathname}${params.size ? `?${params}` : ""}`;
}
