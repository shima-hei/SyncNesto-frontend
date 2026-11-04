import type { QueryClient } from "@tanstack/react-query";
import { isProjectUserChoiceQuery } from "@/lib/query/cache-policy";

import type { UserRead } from "@/lib/api/generated/model";
import {
  getListUsersUsersGetQueryKey as getUserListKey,
  getReadUserUsersUserIdGetQueryKey as getUserDetailKey,
} from "@/lib/api/generated/users/users";

export const invalidateUserList = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getUserListKey() }),
    queryClient.invalidateQueries({
      predicate: (query) => isProjectUserChoiceQuery(query.queryKey),
    }),
  ]);
};

export const setUserDetailCache = (
  queryClient: QueryClient,
  userId: number,
  user: UserRead,
) => {
  queryClient.setQueryData(getUserDetailKey(userId), user);
};
