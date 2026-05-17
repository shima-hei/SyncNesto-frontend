"use client";

import { useListUsersUsersGet } from "@/lib/api/generated/users/users";
import type { ListUsersUsersGetParams } from "@/lib/api/generated/model";

export function useUsers(params: ListUsersUsersGetParams) {
  const usersQuery = useListUsersUsersGet(params, {
    query: {
      retry: false,
      placeholderData: (previousData) => previousData,
    },
  });

  return {
    users: usersQuery.data?.items ?? [],
    total: usersQuery.data?.total ?? 0,
    page: usersQuery.data?.page ?? params.page ?? 1,
    pageSize: usersQuery.data?.page_size ?? params.page_size ?? 20,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
  };
}
