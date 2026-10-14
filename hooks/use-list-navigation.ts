"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { safeListReturn, withListReturn } from "@/lib/navigation/list-return";

export function useListNavigation(fallback: string) {
  const pathname = usePathname();
  const params = useSearchParams();
  const own = new URLSearchParams(params);
  own.delete("returnTo");
  const current = `${pathname}${own.size ? `?${own}` : ""}`;
  const returnTo =
    pathname === fallback.split("?")[0]
      ? current
      : safeListReturn(params.get("returnTo"), fallback);
  return {
    returnTo,
    withReturn: (href: string) => withListReturn(href, returnTo),
  };
}
