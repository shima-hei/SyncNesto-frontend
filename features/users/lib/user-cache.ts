import type { QueryClient } from "@tanstack/react-query";

import type { UserRead } from "@/lib/api/generated/model";
import {
  getListUsersUsersGetQueryKey as getUserListKey,
  getReadUserUsersUserIdGetQueryKey as getUserDetailKey,
} from "@/lib/api/generated/users/users";

export const invalidateUserList = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: getUserListKey(),
  });
};

export const setUserDetailCache = (
  queryClient: QueryClient,
  userId: number,
  user: UserRead
) => {
  queryClient.setQueryData(getUserDetailKey(userId), user);
};
