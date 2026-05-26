import type { QueryClient } from "@tanstack/react-query";

import { getReadCurrentUserAuthMeGetQueryKey as getCurrentUserKey } from "@/lib/api/generated/auth/auth";
import type { CurrentUserRead } from "@/lib/api/generated/model";

export const setCurrentUserCache = (
  queryClient: QueryClient,
  user: CurrentUserRead | null
) => {
  queryClient.setQueryData(getCurrentUserKey(), user);
};

export const invalidateCurrentUser = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: getCurrentUserKey(),
  });
};

export const cancelCurrentUserQuery = (queryClient: QueryClient) => {
  return queryClient.cancelQueries({
    queryKey: getCurrentUserKey(),
  });
};

export const removeCurrentUserCache = (queryClient: QueryClient) => {
  queryClient.removeQueries({
    queryKey: getCurrentUserKey(),
  });
};
