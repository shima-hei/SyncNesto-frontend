"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  NOTIFICATION_POLL_INTERVAL,
  NOTIFICATION_STALE_TIME,
} from "@/lib/query/cache-policy";
import { notificationUnreadCountKey } from "../lib/notification-query-keys";
import type { ListNotificationsNotificationsGetParams } from "@/lib/api/generated/model";
import {
  listNotificationsNotificationsGet,
  markAllReadNotificationsReadAllPost,
  markNotificationReadNotificationsNotificationIdReadPost,
  unreadCountNotificationsUnreadCountGet,
} from "@/lib/api/generated/notifications/notifications";

export function useNotifications(
  params: ListNotificationsNotificationsGetParams,
  enabled = true,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id, "list", params],
    queryFn: ({ signal }) =>
      listNotificationsNotificationsGet(params, { signal }),
    enabled: Boolean(user) && enabled,
    staleTime: NOTIFICATION_STALE_TIME,
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationUnreadCount(projectId?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: notificationUnreadCountKey(user?.id, projectId),
    queryFn: ({ signal }) =>
      unreadCountNotificationsUnreadCountGet(
        { project_id: projectId },
        { signal },
      ),
    enabled: Boolean(user),
    staleTime: NOTIFICATION_STALE_TIME,
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationMutations(projectId?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  const markRead = useMutation({
    mutationFn: (id: number) =>
      markNotificationReadNotificationsNotificationIdReadPost(id),
    onSuccess: refresh,
  });
  const markAllRead = useMutation({
    mutationFn: () =>
      markAllReadNotificationsReadAllPost({ project_id: projectId }),
    onSuccess: refresh,
  });
  return { markRead, markAllRead };
}
