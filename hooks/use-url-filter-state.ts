"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

type Setter<T> = (next: T | ((current: T) => T)) => void;

export function useUrlFilterState(
  key: string,
  fallback: number,
): readonly [number, Setter<number>];
export function useUrlFilterState(
  key: string,
  fallback: string,
): readonly [string, Setter<string>];
export function useUrlFilterState<T extends string | number | null>(
  key: string,
  fallback: T,
): readonly [T, Setter<T>];
export function useUrlFilterState<T extends string | number | null>(
  key: string,
  fallback: T,
) {
  const params = useSearchParams();
  const parse = useCallback(
    (raw: string | null): T => {
      if (raw === null) return fallback;
      if (typeof fallback === "number" || fallback === null) {
        const number = Number(raw);
        return (
          Number.isSafeInteger(number) && number > 0 && number <= 2147483647
            ? number
            : fallback
        ) as T;
      }
      return raw.slice(0, 200) as T;
    },
    [fallback],
  );
  const value = parse(params.get(key));
  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const url = new URL(window.location.href);
      const nextValue =
        typeof next === "function"
          ? next(parse(url.searchParams.get(key)))
          : next;
      if (nextValue === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key, String(nextValue));
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    },
    [fallback, key, parse],
  );
  return [value, setValue] as const;
}
