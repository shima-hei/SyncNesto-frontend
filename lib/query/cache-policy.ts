import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const REFERENCE_STALE_TIME = 60_000;
export const SEARCH_DEBOUNCE_MS = 250;
export const NOTIFICATION_STALE_TIME = 15_000;
export const NOTIFICATION_POLL_INTERVAL = 45_000;

export const refreshActiveQueryIfStale = (
  client: QueryClient,
  queryKey: QueryKey,
  staleTime: number,
) => {
  const state = client.getQueryState(queryKey);
  if (
    state?.fetchStatus === "fetching" ||
    (state?.status === "success" &&
      !state.isInvalidated &&
      Date.now() - state.dataUpdatedAt < staleTime)
  ) {
    return Promise.resolve();
  }
  return client.refetchQueries(
    { queryKey, exact: true, type: "active" },
    { cancelRefetch: false },
  );
};

export const isProjectUserChoiceQuery = (queryKey: QueryKey) =>
  typeof queryKey[0] === "string" &&
  /^\/projects\/\d+\/member-(users|candidates)$/.test(queryKey[0]);
