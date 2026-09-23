"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type UseUrlTabStateOptions<TValue extends string> = {
  values: readonly TValue[];
  defaultValue: TValue;
  paramName?: string;
};

export function useUrlTabState<TValue extends string>({
  values,
  defaultValue,
  paramName = "tab",
}: UseUrlTabStateOptions<TValue>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const validValues = useMemo(() => new Set<string>(values), [values]);
  const rawValue = searchParams.get(paramName);
  const value = validValues.has(rawValue ?? "")
    ? (rawValue as TValue)
    : defaultValue;

  const setValue = useCallback(
    (nextValue: string) => {
      if (!validValues.has(nextValue)) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (nextValue === defaultValue) {
        params.delete(paramName);
      } else {
        params.set(paramName, nextValue);
      }

      const query = params.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [defaultValue, paramName, pathname, router, searchParams, validValues],
  );

  return [value, setValue] as const;
}
